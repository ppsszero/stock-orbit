const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, clipboard, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

const isDev = !app.isPackaged;

/** mainWindow가 살아있을 때만 콜백 실행. IPC 핸들러 안전장치. */
const withWindow = (fn) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  return fn(mainWindow);
};

// 창 크기/위치 저장 경로
const boundsFile = path.join(app.getPath('userData'), 'window-bounds.json');

const loadBounds = () => {
  try { return JSON.parse(fs.readFileSync(boundsFile, 'utf8')); } catch { return null; }
};

const saveBounds = () => {
  if (!mainWindow || mainWindow.isMinimized()) return;
  try { fs.writeFileSync(boundsFile, JSON.stringify(mainWindow.getBounds())); } catch {}
};

function createWindow() {
  const saved = loadBounds();
  mainWindow = new BrowserWindow({
    width: saved?.width || 420,
    height: saved?.height || 680,
    x: saved?.x,
    y: saved?.y,
    minWidth: 340,
    minHeight: 340,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 웹뷰 내 target="_blank" 링크를 같은 웹뷰에서 열기
  mainWindow.webContents.on('did-attach-webview', (_, wvContents) => {
    wvContents.setWindowOpenHandler(({ url }) => {
      wvContents.loadURL(url);
      return { action: 'deny' };
    });
  });

  // dev 로드 실패 재시도 — 무한 루프 방지를 위해 최대 10회 제한
  let devLoadRetries = 0;
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Failed to load:', code, desc);
    if (!isDev) return;
    if (devLoadRetries >= 10) {
      console.error('Dev server unreachable after 10 retries. Giving up.');
      return;
    }
    devLoadRetries++;
    setTimeout(() => withWindow(w => w.loadURL('http://localhost:5173')), 2000);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    devLoadRetries = 0; // 성공 시 리셋
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // resize/move는 끌고 있는 동안 수십 번 발생 → 120ms debounce로 IPC/디스크 스팸 방지
  let resizeTimer = null;
  const onResizeOrMove = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      saveBounds();
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const [w, h] = mainWindow.getSize();
      mainWindow.webContents.send('window-resized', { width: w, height: h });
    }, 120);
  };
  mainWindow.on('resize', onResizeOrMove);
  mainWindow.on('move', onResizeOrMove);

  mainWindow.on('close', (e) => {
    saveBounds();
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

function buildTrayMenu(alwaysOnTop) {
  return Menu.buildFromTemplate([
    { label: 'ORBIT with Npay 증권', enabled: false },
    { type: 'separator' },
    {
      label: '열기',
      click: () => withWindow(w => { w.show(); w.focus(); }),
    },
    {
      label: '항상 위에',
      type: 'checkbox',
      checked: alwaysOnTop,
      click: (menuItem) => withWindow(w => {
        w.setAlwaysOnTop(menuItem.checked);
        w.webContents.send('always-on-top-changed', menuItem.checked);
      }),
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  let trayIcon;
  try {
    const iconPath = isDev
      ? path.join(__dirname, '..', 'src', 'assets', 'logo.png')
      : path.join(process.resourcesPath, 'logo.png');
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    if (trayIcon.isEmpty()) {
      console.error('Tray icon is empty, path:', iconPath);
    }
  } catch (err) {
    console.error('Tray icon error:', err);
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Orbit');
  tray.setContextMenu(buildTrayMenu(true));

  tray.on('double-click', () => {
    withWindow(w => { w.show(); w.focus(); });
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // 렌더러 크래시 감지
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer crashed:', details.reason, details.exitCode);
  });
  mainWindow.on('unresponsive', () => console.error('Window unresponsive'));

  // webview가 attach될 때마다 ESC를 가로채서 호스트로 전달.
  // webview는 격리된 context라 window.addEventListener로는 못 잡기 때문.
  // 리스너는 webContents 수명에 바인딩되어 자동 정리됨.
  mainWindow.webContents.on('did-attach-webview', (_, wc) => {
    wc.on('before-input-event', (_event, input) => {
      if (input.type !== 'keyDown' || input.key !== 'Escape') return;
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send('webview-back');
    });

    // 마우스 뒤로/앞으로 버튼 — webview 내부에 JS 주입, console-message로 수신
    // 중복 등록 방지: 전역 플래그로 리스너가 이미 있는지 확인
    wc.on('did-finish-load', () => {
      wc.executeJavaScript(`
        if (!window.__orbitNavInstalled) {
          window.__orbitNavInstalled = true;
          document.addEventListener('mouseup', (e) => {
            if (e.button === 3) console.log('__orbit_nav:back');
            if (e.button === 4) console.log('__orbit_nav:forward');
          });
        }
      `).catch(() => {});
    });
    wc.on('console-message', (_, _level, message) => {
      if (message === '__orbit_nav:back' && wc.canGoBack()) wc.goBack();
      else if (message === '__orbit_nav:forward' && wc.canGoForward()) wc.goForward();
    });
  });


  // IPC handlers — mainWindow 참조는 withWindow로 안전하게 감싸서 호출
  ipcMain.on('window-minimize', () => withWindow(w => w.hide()));
  ipcMain.on('window-close', () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.on('set-auto-launch', (_, value) => {
    app.setLoginItemSettings({ openAtLogin: value });
  });

  ipcMain.on('set-always-on-top', (_, value) => {
    withWindow(w => w.setAlwaysOnTop(value));
    if (tray) tray.setContextMenu(buildTrayMenu(value));
  });

  ipcMain.on('set-opacity', (_, value) => {
    withWindow(w => w.setOpacity(value));
  });

  ipcMain.on('set-size', (_, { width, height }) => {
    withWindow(w => w.setSize(width, height));
  });

  ipcMain.handle('get-default-screenshot-path', () => {
    return path.join(app.getPath('desktop'), 'stock-orbit');
  });

  ipcMain.handle('get-window-size', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { width: 0, height: 0 };
    const [width, height] = mainWindow.getSize();
    return { width, height };
  });

  // === Naver API Proxy (CORS 우회) ===
  // 보안: renderer가 임의의 URL을 fetch하지 못하도록 네이버 호스트만 허용
  // 실제 사용 도메인: stock(메인 API) / api.stock(환율) / m.stock(모바일) / n.news(뉴스)
  // IPC fetch: naver 서브도메인만 허용. 서브도메인 변경·추가에 유연하게 대응.
  const isAllowedHost = (host) => host === 'naver.com' || host.endsWith('.naver.com');
  ipcMain.handle('naver-fetch', async (_, url) => {
    try {
      let parsed;
      try { parsed = new URL(url); } catch { return { error: 'invalid url' }; }
      if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.host)) {
        return { error: 'host not allowed' };
      }
      const res = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return { error: `HTTP ${res.status}` };
      return { data: await res.json() };
    } catch (err) {
      return { error: err.message };
    }
  });

  // === Screenshot ===
  ipcMain.handle('capture-window', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('Window is not available');
    }
    const image = await mainWindow.webContents.capturePage();
    const size = image.getSize();
    const raw = image.toBitmap();
    const radius = 12 * (mainWindow.webContents.getZoomFactor() || 1);
    const W = size.width;
    const H = size.height;

    // 네 코너의 radius×radius 영역만 순회 (전체 이미지 순회 제거 — ~500배 빨라짐)
    const applyAlpha = (x, y, cx, cy) => {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= (radius - 1) * (radius - 1)) return; // 코너 바깥이 아니면 스킵
      const dist = Math.sqrt(d2);
      const alpha = Math.max(0, Math.min(1, radius - dist));
      const idx = (y * W + x) * 4;
      raw[idx] = Math.round(raw[idx] * alpha);
      raw[idx + 1] = Math.round(raw[idx + 1] * alpha);
      raw[idx + 2] = Math.round(raw[idx + 2] * alpha);
      raw[idx + 3] = Math.round(raw[idx + 3] * alpha);
    };

    const R = Math.ceil(radius);
    for (let y = 0; y < R; y++) {
      for (let x = 0; x < R; x++) {
        applyAlpha(x, y, radius, radius);                             // 좌상
        applyAlpha(W - 1 - x, y, W - radius, radius);                 // 우상
        applyAlpha(x, H - 1 - y, radius, H - radius);                 // 좌하
        applyAlpha(W - 1 - x, H - 1 - y, W - radius, H - radius);     // 우하
      }
    }
    const rounded = nativeImage.createFromBuffer(raw, { width: W, height: H });
    return rounded.toPNG().toString('base64');
  });

  ipcMain.handle('save-screenshot', async (_, base64, savePath, fileName) => {
    try {
      const dir = savePath || path.join(app.getPath('desktop'), 'stock-orbit');
      // path traversal 방지 — fileName에서 디렉토리 성분 제거
      const safeFileName = path.basename(String(fileName || ''));
      if (!safeFileName) return { success: false, error: 'invalid filename' };
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const targetPath = path.join(dir, safeFileName);
      await fs.promises.writeFile(targetPath, Buffer.from(base64, 'base64'));
      return { success: true, path: targetPath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('copy-screenshot', async (_, base64) => {
    try {
      const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'));
      clipboard.writeImage(image);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-folder', async (_, defaultPath) => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: defaultPath || app.getPath('desktop'),
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // === App Info ===
  ipcMain.handle('get-app-version', () => app.getVersion());

  // === Auto Update (GitHub Releases) ===
  // 기본 Windows 알림 대신 in-app 배너로 UI 제공.
  // IPC 핸들러는 dev/prod 모두 등록해야 renderer가 안전하게 invoke 가능.
  ipcMain.handle('check-for-updates', async () => {
    if (isDev) return { success: false, error: 'dev mode' };
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('quit-and-install', () => {
    if (isDev) return;
    autoUpdater.quitAndInstall(false, true);
  });

  if (!isDev) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    const send = (channel, payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
      }
    };

    autoUpdater.on('update-available', (info) => {
      send('update-available', { version: info.version });
    });
    autoUpdater.on('download-progress', (p) => {
      send('update-progress', {
        percent: Math.round(p.percent || 0),
        transferred: p.transferred,
        total: p.total,
        bytesPerSecond: p.bytesPerSecond,
      });
    });
    autoUpdater.on('update-downloaded', (info) => {
      send('update-downloaded', { version: info.version });
    });
    autoUpdater.on('error', (err) => {
      send('update-error', { message: err?.message || String(err) });
    });

    // renderer가 IPC 리스너 붙은 뒤에 체크하도록 load 완료 후 실행
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', () => autoUpdater.checkForUpdates());
    } else {
      autoUpdater.checkForUpdates();
    }
  }

  // === Mail ===
  ipcMain.on('open-mail', (_, email) => {
    shell.openExternal(`mailto:${email}`);
  });

  // F12 devtools toggle (dev 모드 전용)
  // Menu accelerator 방식 — 앱+DevTools 포커스 시 동작, 시스템 간섭 없음
  if (isDev) {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'Dev',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => withWindow(w => w.webContents.reload()) },
          { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => withWindow(w => w.webContents.reloadIgnoringCache()) },
          { label: 'Toggle DevTools', accelerator: 'F12', click: () => withWindow(w => w.webContents.toggleDevTools()) },
        ],
      },
    ]));
  }

});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
