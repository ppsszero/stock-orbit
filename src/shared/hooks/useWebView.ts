import { useEffect, useRef, useState } from 'react';

/**
 * 웹뷰 공통 훅
 * - dom-ready 시점에 loaded=true — DOM 준비 즉시 표시 (이미지 등 리소스는 백그라운드 로드)
 * - 3초 fallback — 이벤트 못 받는 극단 케이스 안전망
 * - 마우스 뒤로/앞으로 → 웹뷰 히스토리 네비게이션
 * - 웹뷰 내 팝업/새창 링크를 같은 웹뷰에서 열기
 */
const LOAD_FALLBACK_MS = 3000;

export const useWebView = (active: boolean) => {
  const wvRef = useRef<ElectronWebviewElement>(null);
  const [loaded, setLoaded] = useState(false);
  const shownOnce = useRef(false);

  useEffect(() => {
    if (!active) {
      setLoaded(false);
      shownOnce.current = false;
      return;
    }

    const wv = wvRef.current;
    if (!wv) return;

    const markLoaded = () => {
      if (shownOnce.current) return;
      shownOnce.current = true;
      setLoaded(true);
    };

    // dom-ready — DOM 준비 즉시 화면 표시 + 마우스 history/drag-scroll 주입
    const onDomReady = () => {
      markLoaded();
      wv.executeJavaScript(`
        (() => {
          // 마우스 4/5 버튼 → 브라우저 히스토리
          document.addEventListener('mouseup', (e) => {
            if (e.button === 3) { e.preventDefault(); history.back(); }
            if (e.button === 4) { e.preventDefault(); history.forward(); }
          });

          // 마우스 드래그 → 스크롤 (모바일 페이지의 가로 carousel/tab strip 조작 가능)
          let scrollEl = null;
          let startX = 0, startY = 0;
          let lastX = 0, lastY = 0;
          let dragging = false;
          const THRESHOLD = 5;

          const findScrollable = (el) => {
            let cur = el;
            while (cur && cur !== document.body && cur !== document.documentElement) {
              const style = getComputedStyle(cur);
              const sx = cur.scrollWidth > cur.clientWidth && /(auto|scroll)/.test(style.overflowX);
              const sy = cur.scrollHeight > cur.clientHeight && /(auto|scroll)/.test(style.overflowY);
              if (sx || sy) return cur;
              cur = cur.parentElement;
            }
            return document.scrollingElement || document.documentElement;
          };

          document.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            startX = lastX = e.clientX;
            startY = lastY = e.clientY;
            dragging = false;
            scrollEl = findScrollable(e.target);
          });

          document.addEventListener('mousemove', (e) => {
            if (!scrollEl) return;
            if (!dragging) {
              if (Math.hypot(e.clientX - startX, e.clientY - startY) > THRESHOLD) {
                dragging = true;
                document.body.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
              } else return;
            }
            e.preventDefault();
            scrollEl.scrollLeft -= e.clientX - lastX;
            scrollEl.scrollTop  -= e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
          });

          const endDrag = () => {
            if (dragging) {
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
            }
            scrollEl = null;
            dragging = false;
          };
          document.addEventListener('mouseup', endDrag);
          document.addEventListener('mouseleave', endDrag);

          // drag 도중에 click 이벤트 막아 link 등 우발 클릭 방지
          document.addEventListener('click', (e) => {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > THRESHOLD) {
              e.preventDefault();
              e.stopPropagation();
            }
          }, true);
        })();
      `).catch(() => {});
    };

    // 팝업/새창 → 같은 웹뷰에서 열기
    const onNewWindow = (e: Event) => {
      e.preventDefault();
      const ev = e as ElectronNewWindowEvent;
      const url = ev.url || ev.detail?.url;
      if (url) wv.loadURL(url);
    };

    // Fallback — dom-ready 못 받는 극단 케이스 안전망
    const fallback = setTimeout(markLoaded, LOAD_FALLBACK_MS);

    wv.addEventListener('dom-ready', onDomReady);
    wv.addEventListener('new-window', onNewWindow);

    return () => {
      clearTimeout(fallback);
      wv.removeEventListener('dom-ready', onDomReady);
      wv.removeEventListener('new-window', onNewWindow);
    };
  }, [active]);

  return { wvRef, loaded };
};
