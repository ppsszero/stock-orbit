const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, clipboard, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
/** 사용자가 설정한 창 투명도 — 트레이 복원 시 100%로 튀지 않도록 추적 (set-opacity로 갱신) */
let currentOpacity = 0.95;
/** 수동 업데이트 체크 여부 — true일 때만 "최신 버전" / 에러 피드백을 렌더러에 전달 */
let isManualUpdateCheck = false;
/** 자동 업데이트 알림 모달 노출 여부 (renderer 설정과 sync). 끄면 자동 발화된 모달 차단,
 *  단 트레이 "업데이트 확인" 같은 수동 액션은 항상 노출. 다운로드 자체는 계속 진행. */
let autoUpdateNotifyEnabled = true;
/** 자동 체크로 발견된 업데이트 상태 캐시 — mute 상태에서 트레이로 수동 확인 시 즉시 복원 */
let pendingUpdate = null; // { phase: 'available' | 'downloading' | 'ready', version, percent? }

const isDev = !app.isPackaged;

// 단일 인스턴스 락 — 앱을 중복 실행하면 새 프로세스가 뜨지 않고
// 기존 창을 복원·포커스함. 락을 못 얻으면 (= 이미 실행 중) 즉시 종료.
// 없으면 트레이/바로가기에서 재실행할 때마다 작업관리자에 프로세스가 쌓임.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

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
    alwaysOnTop: false,
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
    {
      label: '업데이트 확인',
      click: () => {
        withWindow(w => {
          if (!w.isVisible()) w.show();
          w.focus();
        });
        if (isDev) {
          // dev 모드: autoUpdater 없으므로 "최신 버전" 피드백 직접 전달
          withWindow(w => w.webContents.send('update-not-available', {}));
          return;
        }
        // mute 상태에서 백그라운드로 이미 받아둔 업데이트가 있으면 즉시 surface.
        // manual=true 플래그 — renderer 쪽에서 "이 버전 건너뛰기" skip 체크 우회 (사용자 명시 액션).
        if (pendingUpdate) {
          if (pendingUpdate.phase === 'ready') {
            withWindow(w => w.webContents.send('update-downloaded', { version: pendingUpdate.version, manual: true }));
            return;
          }
          if (pendingUpdate.phase === 'downloading' || pendingUpdate.phase === 'available') {
            withWindow(w => w.webContents.send('update-available', { version: pendingUpdate.version, manual: true }));
            if (pendingUpdate.phase === 'downloading' && pendingUpdate.percent != null) {
              withWindow(w => w.webContents.send('update-progress', { percent: pendingUpdate.percent }));
            }
            return;
          }
        }
        try {
          isManualUpdateCheck = true;
          autoUpdater.checkForUpdates();
        } catch (err) {
          isManualUpdateCheck = false;
          withWindow(w => w.webContents.send('update-error', { message: String(err) }));
        }
      },
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
  tray.setContextMenu(buildTrayMenu(false));

  // 싱글 클릭으로 창 보이기.
  // WARNING: transparent + frameless 창은 show() 시 DWM 알파 합성과 렌더러 페인트가
  // 비동기로 진행되는 사이 구 프레임이 보여서 "깜빡임"이 발생함.
  //
  // 해결: opacity 0으로 show → 렌더러가 실제로 2프레임 페인트한 뒤 opacity 1로 복원.
  // - executeJavaScript의 RAF×2는 "레이아웃→페인트→합성" 사이클이 완료됐음을 보장.
  // - 폴백 setTimeout(200ms): 렌더러가 응답 없을 때도 언젠가는 창이 나타나야 함.
  //   (혹시 웹뷰 로드 지연 등으로 RAF가 안 불리는 케이스 대비)
  tray.on('click', () => {
    withWindow(w => {
      if (w.isMinimized()) w.restore();
      if (!w.isVisible()) {
        w.setOpacity(0);
        w.show();

        let revealed = false;
        const reveal = () => {
          if (revealed) return;
          revealed = true;
          // w가 살아있고 webContents도 유효할 때만 opacity 복원
          // 사용자 설정 투명도로 복원 — 하드코딩 1(100%)로 두면 트레이 복원 후 투명도가 풀림
          if (!w.isDestroyed() && !w.webContents.isDestroyed()) w.setOpacity(currentOpacity);
        };

        // 렌더러가 2프레임 완전히 그릴 때까지 대기 → 깜빡임 원천 차단
        w.webContents
          .executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
          .then(reveal)
          .catch(reveal);

        // 안전장치: 어떤 이유로든 RAF가 돌아오지 않으면 200ms 뒤 강제 노출
        setTimeout(reveal, 200);
      } else {
        w.focus();
      }
    });
  });
}

// webview에 포커스가 있어도 앱 단축키(F9 스크린샷 등)가 동작하도록
// — webview의 webContents.before-input-event를 잡아 메인 윈도우로 forward.
// 메인 렌더러는 preload onWebviewKey로 받아 KeyboardEvent로 재발화해 기존 keydown listener에서 처리.
app.on('web-contents-created', (_e, contents) => {
  if (contents.getType() !== 'webview') return;
  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const isFn = /^F([1-9]|1[0-2])$/.test(input.key);
    const hasModifier = input.control || input.alt || input.meta;
    // 일반 타이핑(글자 입력)은 보내지 않음 — 단축키 조합/펑션키만 forward
    if (!isFn && !hasModifier) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('webview-key', {
      key: input.key,
      code: input.code,
      ctrl: input.control,
      alt: input.alt,
      shift: input.shift,
      meta: input.meta,
    });
    // webview 안에서 처리 안 되도록 막음 (예: 페이지의 Ctrl+S 가로채기 방지)
    if (hasModifier) event.preventDefault();
  });
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  // 렌더러 크래시 감지
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer crashed:', details.reason, details.exitCode);
  });
  mainWindow.on('unresponsive', () => console.error('Window unresponsive'));

  // 활성 webview 추적 — 호스트에서 F5를 눌러도 웹뷰를 새로고침하기 위해 필요
  let activeWebview = null;

  // webview가 attach될 때마다 ESC를 가로채서 호스트로 전달.
  // webview는 격리된 context라 window.addEventListener로는 못 잡기 때문.
  // 리스너는 webContents 수명에 바인딩되어 자동 정리됨.
  mainWindow.webContents.on('did-attach-webview', (_, wc) => {
    activeWebview = wc;
    wc.on('destroyed', () => { if (activeWebview === wc) activeWebview = null; });

    wc.on('before-input-event', (_event, input) => {
      if (input.type !== 'keyDown') return;
      // ESC → 호스트의 backStack으로 전달
      if (input.key === 'Escape') {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.webContents.send('webview-back');
        return;
      }
      // F5 → 웹뷰 새로고침 (웹뷰 내부 포커스)
      if (input.key === 'F5' && !wc.isDestroyed()) {
        wc.reload();
      }
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
  // X 버튼 = 트레이로 숨김 (완전 종료는 트레이 우클릭 → 종료).
  // 상시 실행 위젯 UX에 맞춘 Slack/Discord 스타일.
  ipcMain.on('window-close', () => withWindow(w => w.hide()));

  // 호스트에서 F5 → 활성 웹뷰 새로고침 (웹뷰에 포커스가 없어도 동작)
  ipcMain.on('reload-webview', () => {
    if (activeWebview && !activeWebview.isDestroyed()) activeWebview.reload();
  });

  ipcMain.on('set-auto-launch', (_, value) => {
    app.setLoginItemSettings({ openAtLogin: value });
  });

  ipcMain.on('set-always-on-top', (_, value) => {
    withWindow(w => w.setAlwaysOnTop(value));
    if (tray) tray.setContextMenu(buildTrayMenu(value));
  });

  ipcMain.on('set-opacity', (_, value) => {
    currentOpacity = value;
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
    const FETCH_TIMEOUT_MS = 10_000;
    try {
      let parsed;
      try { parsed = new URL(url); } catch { return { error: 'invalid url' }; }
      if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.host)) {
        return { error: 'host not allowed' };
      }
      // AbortController로 timeout — 일부 endpoint(m.stock.naver.com/front-api/...)가
      // 간헐적으로 응답을 끝내지 않아 fetch가 영원히 hang하는 케이스 방지
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(parsed.toString(), {
          signal: ac.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            // m.stock.naver.com front-api는 Referer 없으면 차단되는 경로가 있어 안전하게 동일 도메인으로 세팅
            'Referer': `${parsed.protocol}//${parsed.host}/`,
          },
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        return { data: await res.json() };
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      return { error: err.name === 'AbortError' ? 'request timeout' : err.message };
    }
  });

  // === Yahoo Finance 실시간 스트리머 (해외 연장가 / 오버나잇) ===
  // 네이버는 US 오버나잇(8pm~4am ET = KST 09:00~17:00)을 안 줌. REST(v7/v8)도 8pm ET에서 끊김.
  // 야후 WS 스트리머만 오버나잇 라이브를 푸시 → ws로 구독, protobuf 디코드, 최신값 캐시.
  // 의존성 ws: Electron 메인(Node 20)에 WebSocket 전역이 없어 도입 (Yahoo 오버나잇 유일 경로).
  const WebSocket = require('ws');
  const YAHOO_WS_URL = 'wss://streamer.finance.yahoo.com/?version=2';
  const YAHOO_STALE_MS = 5 * 60 * 1000;   // 5분 이상 미수신 → stale = 네이버 fallback (주말/완전마감)

  let yahooWs = null;
  let yahooConnected = false;
  let yahooReconnectTimer = null;
  let yahooReconnectDelay = 1000;          // 1s → 2 → 4 ... cap 30s
  const yahooTracked = new Set();          // 구독 중인 티커 (연결과 독립 — 재연결 시 전체 재구독)
  const yahooCache = new Map();            // ticker → { price, change, changePercent, marketHours, receivedAt }

  // protobuf PricingData 최소 디코더 (1=id str, 2=price f32, 7=marketHours varint, 8=changePercent f32, 12=change f32)
  const decodeYahooPricing = (b64) => {
    const buf = Buffer.from(b64, 'base64');
    let i = 0; const out = {};
    while (i < buf.length) {
      const tag = buf[i++], field = tag >> 3, wire = tag & 7;
      if (wire === 2) { const len = buf[i++]; out[field] = buf.slice(i, i + len).toString('utf8'); i += len; }
      else if (wire === 5) { out[field] = buf.readFloatLE(i); i += 4; }
      else if (wire === 0) { let b; do { b = buf[i++]; } while (b & 0x80); out[field] = field === 7 ? buf[i - 1] : 0; } // 미사용 varint(time 등)는 값 무시, marketHours만 단일바이트로 충분
      else if (wire === 1) { i += 8; }     // 64bit fixed — 미사용 스킵
      else break;
    }
    if (out[1] == null || out[2] == null) return null;
    return { id: out[1], price: out[2], change: out[12] ?? 0, changePercent: out[8] ?? 0, marketHours: out[7] ?? -1 };
  };

  const yahooSend = (obj) => { try { if (yahooWs && yahooConnected) yahooWs.send(JSON.stringify(obj)); } catch { /* noop */ } };

  const scheduleYahooReconnect = () => {
    if (yahooReconnectTimer || yahooTracked.size === 0) return;  // 구독 대상 없으면 보류
    yahooReconnectTimer = setTimeout(() => {
      yahooReconnectTimer = null;
      yahooReconnectDelay = Math.min(yahooReconnectDelay * 2, 30_000);
      yahooConnect();
    }, yahooReconnectDelay);
  };

  const yahooConnect = () => {
    if (yahooWs) return;
    try { yahooWs = new WebSocket(YAHOO_WS_URL); } catch { scheduleYahooReconnect(); return; }
    yahooWs.on('open', () => {
      yahooConnected = true;
      yahooReconnectDelay = 1000;
      if (yahooTracked.size > 0) yahooSend({ subscribe: [...yahooTracked] });
      console.log(`[yahoo-ws] open · subscribe ${yahooTracked.size}: ${[...yahooTracked].join(',')}`);
    });
    yahooWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'pricing' && msg.message) {
          const q = decodeYahooPricing(msg.message);
          if (q) yahooCache.set(q.id, { price: q.price, change: q.change, changePercent: q.changePercent, marketHours: q.marketHours, receivedAt: Date.now() });
        }
      } catch { /* 비-JSON / 디코드 실패 → 무시 */ }
    });
    const onDown = (info) => {
      yahooConnected = false; yahooWs = null;
      console.log(`[yahoo-ws] down (${info && info.message ? info.message : 'closed'}) · reconnect in ${yahooReconnectDelay}ms`);
      scheduleYahooReconnect();
    };
    yahooWs.on('close', () => onDown());
    yahooWs.on('error', onDown);
  };

  const yahooEnsureSubscribed = (tickers) => {
    const fresh = tickers.filter(t => t && !yahooTracked.has(t));
    fresh.forEach(t => yahooTracked.add(t));
    if (yahooConnected && fresh.length > 0) yahooSend({ subscribe: fresh });
    yahooConnect();   // 미연결이면 연결 (open에서 전체 재구독)
  };

  ipcMain.handle('yahoo-quotes', async (_, tickers) => {
    const meta = () => ({ connected: yahooConnected, tracked: yahooTracked.size, fresh: 0 });
    if (!Array.isArray(tickers) || tickers.length === 0) return { quotes: {}, meta: meta() };
    yahooEnsureSubscribed(tickers);
    const now = Date.now();
    const quotes = {};
    for (const t of tickers) {
      const c = yahooCache.get(t);
      if (c && now - c.receivedAt < YAHOO_STALE_MS) {
        quotes[t] = { price: c.price, change: c.change, changePercent: c.changePercent, marketHours: c.marketHours };
      }
    }
    return { quotes, meta: { connected: yahooConnected, tracked: yahooTracked.size, fresh: Object.keys(quotes).length } };
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
  // 트레이 "업데이트 확인"과 동일 동작: pendingUpdate 있으면 즉시 manual=true로 surface,
  // 없으면 autoUpdater 실제 체크.
  ipcMain.handle('check-for-updates', async () => {
    if (isDev) {
      withWindow(w => w.webContents.send('update-not-available', {}));
      return { success: false, error: 'dev mode' };
    }
    if (pendingUpdate) {
      if (pendingUpdate.phase === 'ready') {
        withWindow(w => w.webContents.send('update-downloaded', { version: pendingUpdate.version, manual: true }));
        return { success: true, version: pendingUpdate.version };
      }
      if (pendingUpdate.phase === 'downloading' || pendingUpdate.phase === 'available') {
        withWindow(w => w.webContents.send('update-available', { version: pendingUpdate.version, manual: true }));
        if (pendingUpdate.phase === 'downloading' && pendingUpdate.percent != null) {
          withWindow(w => w.webContents.send('update-progress', { percent: pendingUpdate.percent }));
        }
        return { success: true, version: pendingUpdate.version };
      }
    }
    try {
      isManualUpdateCheck = true;
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err) {
      isManualUpdateCheck = false;
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('quit-and-install', () => {
    if (isDev) return;
    // oneClick 모드는 isSilent=false여도 마법사 안 뜸 (oneClick은 wizard 자체가 없음).
    // false로 두면 NSIS의 작은 진행바 창이 보여서 사용자가 "설치 진행 중" 인지 가능.
    // true로 두면 /S 플래그 → 진행바도 안 떠서 검은 갭만 길어짐 (UX 손해).
    // isForceRunAfter=true → 설치 후 자동 재실행.
    autoUpdater.quitAndInstall(false, true);
  });

  // 사용자가 배너에서 '지금 받기' 선택 시에만 다운로드 시작 (autoDownload=false)
  ipcMain.on('download-update', () => {
    if (isDev) return;
    autoUpdater.downloadUpdate();
  });

  // renderer settings → autoUpdateNotifyEnabled sync
  ipcMain.on('set-update-notify', (_, value) => {
    autoUpdateNotifyEnabled = !!value;
  });

  if (!isDev) {
    // 발견 즉시 받지 않음 — 사용자가 배너에서 '지금 받기'를 누를 때만 downloadUpdate().
    // ('나중에'/'건너뛰기' 시 다운로드 자체가 없어 대역폭/디스크 낭비 방지)
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    const send = (channel, payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, payload);
      }
    };

    // 자동 체크 + mute 상태면 모달 차단. 사용자가 트레이로 직접 확인하면 isManualUpdateCheck=true.
    // 다운로드 자체는 항상 진행 (autoDownload=true) — mute는 UI만 막을 뿐.
    const shouldNotify = () => isManualUpdateCheck || autoUpdateNotifyEnabled;

    autoUpdater.on('update-available', (info) => {
      pendingUpdate = { phase: 'available', version: info.version };
      if (shouldNotify()) send('update-available', { version: info.version });
    });
    autoUpdater.on('download-progress', (p) => {
      const percent = Math.round(p.percent || 0);
      pendingUpdate = { ...(pendingUpdate || {}), phase: 'downloading', percent };
      if (shouldNotify()) {
        send('update-progress', {
          percent,
          transferred: p.transferred,
          total: p.total,
          bytesPerSecond: p.bytesPerSecond,
        });
      }
    });
    autoUpdater.on('update-downloaded', (info) => {
      pendingUpdate = { phase: 'ready', version: info.version };
      if (shouldNotify()) send('update-downloaded', { version: info.version });
      // 터미널 이벤트 — 수동 체크 플래그 리셋. 안 그러면 manual 체크가 업데이트를 찾은 뒤
      // (not-available/error가 안 와서) 플래그가 true로 남아 이후 자동 체크도 manual로 취급됨.
      isManualUpdateCheck = false;
    });
    autoUpdater.on('update-not-available', () => {
      // 수동 체크일 때만 "최신 버전" 피드백. 자동 체크는 조용히 넘김.
      if (isManualUpdateCheck) send('update-not-available', {});
      isManualUpdateCheck = false;
    });
    autoUpdater.on('error', (err) => {
      // 수동 체크일 때만 에러 표시. 자동 체크 에러는 무시 (네트워크 불안정 등).
      if (isManualUpdateCheck) send('update-error', { message: err?.message || String(err) });
      isManualUpdateCheck = false;
    });

    // renderer가 IPC 리스너 붙은 뒤에 체크하도록 load 완료 후 실행.
    // 추가로 3초 지연 — renderer의 useSyncElectron useEffect가 autoUpdateNotify 값을 main에 보낼 시간 확보.
    // 안 그러면 첫 check가 default(true) 상태에서 발동되어 mute 설정이 무시될 수 있음.
    const startInitialCheck = () => setTimeout(() => autoUpdater.checkForUpdates(), 3000);
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', startInitialCheck);
    } else {
      startInitialCheck();
    }

    // 6시간 간격 자동 체크 — 트레이 상주 상태에서도 업데이트를 놓치지 않도록.
    // isManualUpdateCheck = false 상태이므로 업데이트 없으면 조용히 넘어감.
    setInterval(() => autoUpdater.checkForUpdates(), 6 * 60 * 60 * 1000);
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
