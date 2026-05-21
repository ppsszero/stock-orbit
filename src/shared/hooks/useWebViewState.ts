import { useCallback, useEffect, useState } from 'react';

/**
 * 시트 내 웹뷰 패널의 표시 상태 관리.
 * - view: 현재 열린 웹뷰 정보 (null이면 닫힘)
 * - open: 웹뷰 열기 (url 필수, title/subtitle 옵션)
 * - close: 웹뷰 닫기
 * - sheetOpen 전달 시: 시트가 닫히면 웹뷰도 자동 close (stale 잔존 방지)
 *
 * 사용 패턴:
 *   const { view, open, close } = useWebViewState(sheetOpen);
 *   <div onClick={() => open(url, { title, subtitle: cat })}>
 *   <WebViewPanel url={view?.url ?? null} title={view?.title} subtitle={view?.subtitle} onClose={close} />
 */
export interface WebViewState {
  url: string;
  title?: string;
  subtitle?: string;
}

export function useWebViewState(sheetOpen?: boolean) {
  const [view, setView] = useState<WebViewState | null>(null);

  const open = useCallback((url: string, opts?: { title?: string; subtitle?: string }) => {
    setView({ url, title: opts?.title, subtitle: opts?.subtitle });
  }, []);

  const close = useCallback(() => setView(null), []);

  // sheet가 닫힐 때 웹뷰도 함께 정리 — 다음 시트 열림에 잔존하지 않도록
  useEffect(() => {
    if (sheetOpen === false) setView(null);
  }, [sheetOpen]);

  return { view, open, close };
}
