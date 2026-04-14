import { useEffect } from 'react';

/**
 * ESC 키 또는 마우스 뒤로 버튼(button 3)으로 뒤로가기.
 *
 * 여러 레이어가 동시에 활성화돼 있을 때 (예: Sheet 위에 WebView) **가장 최근에
 * 활성화된 핸들러만** 실행되도록 stack으로 관리한다. — 스택의 top만 호출.
 * 이렇게 하지 않으면 ESC 한 번에 여러 UI가 동시에 닫히는 문제가 발생한다.
 */
type BackHandler = () => void;
const backStack: BackHandler[] = [];

const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  const top = backStack[backStack.length - 1];
  if (top) top();
};
const onMouse = (e: MouseEvent) => {
  if (e.button !== 3) return;
  const top = backStack[backStack.length - 1];
  if (top) { e.preventDefault(); top(); }
};

const handleWebviewBack = () => {
  const top = backStack[backStack.length - 1];
  if (top) top();
};

// 전역 리스너는 한 번만 등록. HMR 시 정리되도록 cleanup 저장.
let offWebviewBack: (() => void) | undefined;
if (typeof window !== 'undefined') {
  // 동일 (event, fn) 쌍은 브라우저가 재등록을 무시하므로 HMR 안전
  window.addEventListener('keydown', onKey);
  window.addEventListener('mouseup', onMouse);
  // webview 내부에서 ESC 눌렀을 때도 stack top 실행 (main 프로세스 경유)
  offWebviewBack = window.electronAPI?.onWebviewBack?.(handleWebviewBack);
}

// Vite HMR: 모듈 재평가 시 IPC 리스너 중복 등록 방지
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('mouseup', onMouse);
    offWebviewBack?.();
    backStack.length = 0;
  });
}

export const useBackAction = (active: boolean, onBack: () => void) => {
  useEffect(() => {
    if (!active) return;
    backStack.push(onBack);
    return () => {
      const idx = backStack.lastIndexOf(onBack);
      if (idx !== -1) backStack.splice(idx, 1);
    };
  }, [active, onBack]);
};
