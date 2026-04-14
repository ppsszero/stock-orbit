import { useStore } from '.';
import { useMemo } from 'react';
import { lightTheme, darkTheme } from '@/shared/styles/theme';

export const ALL_TAB_ID = '__all__';

/** 현재 테마 객체 */
export const useTheme = () => {
  const isDark = useStore(s => s.settings.theme === 'dark');
  return isDark ? darkTheme : lightTheme;
};

/** 다크모드 여부 */
export const useIsDark = () => useStore(s => s.settings.theme === 'dark');

/** 활성 프리셋 */
export const useActivePreset = () => {
  const presets = useStore(s => s.presets);
  const activeId = useStore(s => s.activeId);
  return presets.find(p => p.id === activeId) || presets[0];
};

/** 전체 탭 여부 */
export const useIsAllView = () => useStore(s => s.activeId === ALL_TAB_ID);

/** 전체 탭일 때 모든 프리셋의 유니크 심볼 */
export const useAllSymbols = () => {
  const presets = useStore(s => s.presets);
  return useMemo(() => {
    const seen = new Set<string>();
    return presets.flatMap(p => p.symbols.filter(sym => {
      if (seen.has(sym.code)) return false;
      seen.add(sym.code);
      return true;
    }));
  }, [presets]);
};

/** 현재 표시할 심볼 리스트 */
export const useDisplaySymbols = () => {
  const isAll = useIsAllView();
  const allSymbols = useAllSymbols();
  const activePreset = useActivePreset();
  return isAll ? allSymbols : activePreset.symbols;
};

// NOTE: "전체" 탭에서는 프리셋 = 그룹. 각 프리셋이 하나의 그룹으로 표시됨.
// 개별 프리셋 탭에서는 undefined 반환 → useStockGroups가 국내/해외 자동 분류.
export const useGroupedSymbols = () => {
  const isAll = useIsAllView();
  const presets = useStore(s => s.presets);
  return useMemo(() => {
    if (!isAll) return undefined;
    return presets.filter(p => p.symbols.length > 0).map(p => ({
      label: p.name,
      items: p.symbols,
    }));
  }, [isAll, presets]);
};

/** 시트 열림 여부 체크 */
export const useIsSheetOpen = (name: string) =>
  useStore(s => s.openSheet === name);

/** 활성 그룹 ID (전체 탭이면 첫 번째 프리셋) */
export const useActiveGroupId = () => {
  const activeId = useStore(s => s.activeId);
  const presets = useStore(s => s.presets);
  return activeId === ALL_TAB_ID ? (presets[0]?.id || 'default') : activeId;
};

/** 전체 그룹 통틀어 중복 제거된 종목 수 — MAX_TOTAL_SYMBOLS 제한 체크용 */
export const useTotalUniqueSymbolCount = () => {
  const presets = useStore(s => s.presets);
  return useMemo(
    () => new Set(presets.flatMap(p => p.symbols.map(s => s.code))).size,
    [presets],
  );
};
