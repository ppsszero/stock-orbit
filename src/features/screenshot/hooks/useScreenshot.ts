import { useEffect, useCallback } from 'react';
import { useStore } from '@/app/store';
import { parseShortcut } from '../utils/parseShortcut';
import { fmtTimestamp } from '@/shared/utils/format';

type ResultType = 'copy' | 'success' | 'error';

/**
 * 스크린샷 촬영 + 키보드 단축키 바인딩.
 *
 * - 앱 포커스 시에만 동작 (globalShortcut 아닌 keydown 이벤트)
 * - 설정의 mode에 따라 클립보드 복사 또는 파일 저장
 * - 캡처 결과(성공/실패) 토스트 콜백 호출
 */
export const useScreenshot = (onResult: (message: string, type: ResultType) => void) => {
  const settings = useStore(s => s.settings.screenshot);

  const capture = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.captureWindow) return;

    try {
      const base64 = await api.captureWindow();

      if (settings.mode === 'clipboard') {
        const result = await api.copyScreenshot(base64);
        if (result.success) {
          onResult('스크린샷을 클립보드에 복사했어요', 'copy');
        } else {
          onResult('클립보드 복사에 실패했어요', 'error');
        }
      } else {
        const fileName = `stock-orbit-${fmtTimestamp(new Date())}.png`;
        const result = await api.saveScreenshot(base64, settings.savePath, fileName);
        if (result.success) {
          onResult('스크린샷을 저장했어요', 'success');
        } else {
          onResult(result.error || '스크린샷 저장에 실패했어요', 'error');
        }
      }
    } catch (e) {
      onResult('스크린샷 촬영에 실패했어요', 'error');
    }
  }, [settings.mode, settings.savePath, onResult]);

  // 단축키 바인딩 — 앱 포커스일 때만 (keydown 이벤트)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (parseShortcut(e) === settings.shortcut) {
        e.preventDefault();
        capture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.shortcut, capture]);

  return { capture };
};
