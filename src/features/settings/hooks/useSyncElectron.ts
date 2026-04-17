import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/app/store';
import { logger } from '@/shared/utils/logger';

/**
 * Electron window 속성과 zustand settings를 동기화하는 훅.
 * App.tsx에서 한 번만 호출.
 */
export const useSyncElectron = () => {
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);

  // alwaysOnTop
  useEffect(() => {
    window.electronAPI?.setAlwaysOnTop(settings.alwaysOnTop);
  }, [settings.alwaysOnTop]);

  // opacity
  useEffect(() => {
    window.electronAPI?.setOpacity(settings.opacity);
  }, [settings.opacity]);

  // fontSize → zoom
  useEffect(() => {
    const zoom = { small: 0.875, medium: 1, large: 1.125, xlarge: 1.25 }[settings.fontSize] || 1;
    window.electronAPI?.setZoom(zoom);
  }, [settings.fontSize]);

  // autoCleanLogs
  useEffect(() => {
    logger.setAutoClean(settings.autoCleanLogs);
  }, [settings.autoCleanLogs]);

  // autoLaunch
  useEffect(() => {
    window.electronAPI?.setAutoLaunch(settings.autoLaunch);
  }, [settings.autoLaunch]);

  // 트레이에서 항상 위에 변경 시 동기화
  useEffect(() => {
    window.electronAPI?.onAlwaysOnTopChanged((value: boolean) => {
      updateSettings({ alwaysOnTop: value });
    });
  }, [updateSettings]);

  // 창 리사이즈 → 설정 해상도 동기화 (디바운스 300ms)
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    window.electronAPI?.onWindowResized((size) => {
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => updateSettings({ resolution: size }), 300);
    });
    return () => clearTimeout(resizeTimer.current);
  }, [updateSettings]);

  // 앱 시작 시 실제 창 크기로 settings.resolution 동기화.
  // window-bounds.json에서 복원된 크기는 resize 이벤트를 발생시키지 않으므로
  // localStorage의 이전 값이 stale하게 표시되는 문제 방지.
  useEffect(() => {
    const sync = async () => {
      try {
        const size = await window.electronAPI?.getWindowSize();
        if (size && size.width > 0 && size.height > 0) {
          updateSettings({ resolution: size });
        }
      } catch { /* ignore */ }
    };
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
