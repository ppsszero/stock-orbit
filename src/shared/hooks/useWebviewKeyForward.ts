import { useEffect } from 'react';

/**
 * webview에 포커스가 가 있을 때 앱 단축키(F9 스크린샷 등)가 안 먹는 문제 해결.
 *
 * Electron main이 webview의 `before-input-event`를 잡아 ipc로 forward → 여기서
 * 정상 KeyboardEvent로 재발화. useScreenshot 등 `window.addEventListener('keydown')`
 * 로 단축키 처리하는 기존 핸들러가 그대로 작동.
 *
 * App 루트에서 1회만 호출.
 */
export const useWebviewKeyForward = () => {
  useEffect(() => {
    // electronAPI 미정의 환경(테스트/스토리북)에서도 useEffect cleanup 시그니처 보장
    const off = window.electronAPI?.onWebviewKey?.(({ key, code, ctrl, alt, shift, meta }) => {
      const event = new KeyboardEvent('keydown', {
        key, code,
        ctrlKey: ctrl, altKey: alt, shiftKey: shift, metaKey: meta,
        bubbles: true, cancelable: true,
      });
      window.dispatchEvent(event);
    });
    return () => { off?.(); };
  }, []);
};
