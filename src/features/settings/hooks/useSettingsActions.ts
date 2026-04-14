import { useCallback } from 'react';
import { AppSettings } from '@/shared/types';

/** 최소 윈도우 크기 제한 (electron main.js의 minWidth/minHeight와 일치) */
const MIN_WIDTH = 340;
const MIN_HEIGHT = 340;
/** 최대치는 모니터 크기 등 환경 의존이지만, 방어적으로 상한 둠 */
const MAX_WIDTH = 4000;
const MAX_HEIGHT = 4000;

/**
 * 설정 변경 시 side effect를 포함하는 action들을 분리.
 *
 * 왜 분리했는가:
 * - SettingsSheet UI 내부에서 window.electronAPI?.setSize() 직접 호출이 있었음
 * - UI 컴포넌트는 "의도(onResize)"만 전달하고, side effect는 hook에서 처리
 * - Electron API 의존성을 UI에서 완전히 제거
 *
 * commit 방식:
 * - 유효값(숫자 + 최소/최대 범위)일 때만 스토어 + setSize 호출
 * - 무효값(빈 문자열, NaN, 범위 밖)이면 no-op — 입력 중 리셋되는 버그 방지
 */
export const useSettingsActions = (
  settings: AppSettings,
  onUpdate: (patch: Partial<AppSettings>) => void,
) => {
  const commitResolution = useCallback((dimension: 'width' | 'height', value: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return;
    const [min, max] = dimension === 'width' ? [MIN_WIDTH, MAX_WIDTH] : [MIN_HEIGHT, MAX_HEIGHT];
    if (parsed < min || parsed > max) return;
    const newResolution = { ...settings.resolution, [dimension]: parsed };
    onUpdate({ resolution: newResolution });
    window.electronAPI?.setSize(newResolution);
  }, [settings.resolution, onUpdate]);

  const commitResolutionWidth = useCallback(
    (value: string) => commitResolution('width', value),
    [commitResolution],
  );

  const commitResolutionHeight = useCallback(
    (value: string) => commitResolution('height', value),
    [commitResolution],
  );

  return { commitResolutionWidth, commitResolutionHeight };
};
