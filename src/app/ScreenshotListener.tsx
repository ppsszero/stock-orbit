import { useCallback } from 'react';
import { useScreenshot } from '@/features/screenshot';
import { useToast } from '@/shared/ui/Toast';

/**
 * 스크린샷 단축키 리스너.
 * ToastProvider 내부에 위치해야 useToast 사용 가능.
 * UI를 렌더하지 않음 — 순수 이벤트 리스너.
 */
export const ScreenshotListener = () => {
  const toast = useToast();

  const handleResult = useCallback((message: string, type: 'copy' | 'success' | 'error') => {
    toast.show(message, type);
  }, [toast]);

  useScreenshot(handleResult);

  return null;
};
