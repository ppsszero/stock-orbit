import { useEffect, useRef, useState } from 'react';
import { WEBVIEW_LOAD_DELAY } from '../constants';

/**
 * 웹뷰 공통 훅
 * - active가 true로 바뀔 때 딱 한번만 로딩 표시
 * - 마우스 뒤로/앞으로 → 웹뷰 히스토리 네비게이션
 * - 웹뷰 내 팝업/새창 링크를 같은 웹뷰에서 열기
 */
export const useWebView = (active: boolean) => {
  const wvRef = useRef<ElectronWebviewElement>(null);
  const [loaded, setLoaded] = useState(false);
  const shownOnce = useRef(false);

  // 최초 오픈 시 딱 한번만 로딩
  useEffect(() => {
    if (!active) {
      setLoaded(false);
      shownOnce.current = false;
      return;
    }
    if (!shownOnce.current) {
      shownOnce.current = true;
      setLoaded(false);
      const timer = setTimeout(() => setLoaded(true), WEBVIEW_LOAD_DELAY);
      return () => clearTimeout(timer);
    }
  }, [active]);

  // 웹뷰 이벤트 바인딩
  useEffect(() => {
    if (!active) return;
    const wv = wvRef.current;
    if (!wv) return;

    let injected = false;

    const onDomReady = () => {
      if (injected) return;
      injected = true;
      // 마우스 뒤로/앞으로 → 웹뷰 히스토리
      wv.executeJavaScript(`
        document.addEventListener('mouseup', (e) => {
          if (e.button === 3) { e.preventDefault(); history.back(); }
          if (e.button === 4) { e.preventDefault(); history.forward(); }
        });
      `).catch(() => {});
    };

    // 팝업/새창 링크 → 같은 웹뷰에서 열기
    const onNewWindow = (e: Event) => {
      e.preventDefault();
      const ev = e as ElectronNewWindowEvent;
      const url = ev.url || ev.detail?.url;
      if (url) wv.loadURL(url);
    };

    wv.addEventListener('dom-ready', onDomReady);
    wv.addEventListener('new-window', onNewWindow);

    return () => {
      wv.removeEventListener('dom-ready', onDomReady);
      wv.removeEventListener('new-window', onNewWindow);
    };
  }, [active]);

  return { wvRef, loaded };
};
