const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (value) => ipcRenderer.send('set-always-on-top', value),
  setAutoLaunch: (value) => ipcRenderer.send('set-auto-launch', value),
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),
  setSize: (size) => ipcRenderer.send('set-size', size),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on('always-on-top-changed', (_, value) => callback(value));
  },
  onWindowResized: (callback) => {
    ipcRenderer.on('window-resized', (_, size) => callback(size));
  },
  // Naver API proxy (CORS 우회)
  naverFetch: (url) => ipcRenderer.invoke('naver-fetch', url),
  // 줌 팩터 (글자 크기)
  setZoom: (factor) => webFrame.setZoomFactor(factor),
  getDefaultScreenshotPath: () => ipcRenderer.invoke('get-default-screenshot-path'),
  // 스크린샷
  captureWindow: () => ipcRenderer.invoke('capture-window'),
  saveScreenshot: (base64, savePath, fileName) => ipcRenderer.invoke('save-screenshot', base64, savePath, fileName),
  copyScreenshot: (base64) => ipcRenderer.invoke('copy-screenshot', base64),
  selectFolder: (defaultPath) => ipcRenderer.invoke('select-folder', defaultPath),
  // 앱 정보
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openMail: (email) => ipcRenderer.send('open-mail', email),
  // 자동 업데이트
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  // NOTE: 각 listener는 cleanup 함수를 반환. useEffect에서 반드시 호출해 주세요.
  onUpdateAvailable: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
  // webview 내부에서 ESC 눌렀을 때 호스트가 받는 이벤트
  onWebviewBack: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('webview-back', handler);
    return () => ipcRenderer.removeListener('webview-back', handler);
  },
});
