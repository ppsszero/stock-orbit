/** @jsxImportSource @emotion/react */
import { css, Global } from '@emotion/react';
import { useCallback } from 'react';
import { globalStyles } from '@/shared/styles/global';
import { useStore } from './store';
import { useTheme, useIsDark, useDisplaySymbols } from './store/selectors';
import { useStockPrices } from '@/features/stock/hooks/useStockPrices';
import { useMarqueeData } from '@/features/marquee/hooks/useMarqueeData';
import { useSyncElectron } from '@/features/settings/hooks/useSyncElectron';

import { TitleBar } from './layout/TitleBar';
import { StatusBar } from './layout/StatusBar';
import { SheetManager } from './SheetManager';
import { StockViewSwitch } from './StockViewSwitch';
import { ToastProvider } from '@/shared/ui/Toast';
import { ConfirmProvider, useConfirm } from '@/shared/ui/ConfirmDialog';
import { MarqueeTicker } from '@/features/marquee';
import { PresetTabs } from '@/features/preset';
import { ScreenshotListener } from './ScreenshotListener';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { UpdateBanner } from '@/shared/ui/UpdateBanner';
import { sem } from '@/shared/styles/semantic';

/**
 * 최초 X 클릭 시 "트레이로 숨어요" 안내를 한 번만 표시.
 * localStorage 플래그로 이후에는 스킵.
 */
const TRAY_HIDE_NOTICE_KEY = 'orbit-tray-hide-notice-shown';

export const App = () => (
  <ToastProvider>
    <ConfirmProvider>
      <AppContent />
    </ConfirmProvider>
  </ToastProvider>
);

const AppContent = () => {
  const theme = useTheme();
  const isDark = useIsDark();
  const settings = useStore(s => s.settings);
  const presets = useStore(s => s.presets);
  const activeId = useStore(s => s.activeId);
  const setActiveId = useStore(s => s.setActiveId);
  const removePreset = useStore(s => s.removePreset);
  const renamePreset = useStore(s => s.renamePreset);
  const setSheet = useStore(s => s.setSheet);
  const setHighlightCode = useStore(s => s.setHighlightCode);
  const updateSettings = useStore(s => s.updateSettings);
  const confirm = useConfirm();

  const toggleTheme = useCallback(() => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  }, [settings.theme, updateSettings]);

  const toggleCurrency = useCallback(() => {
    updateSettings({ currencyMode: settings.currencyMode === 'KRW' ? 'USD' : 'KRW' });
  }, [settings.currencyMode, updateSettings]);

  const cycleViewMode = useCallback(() => {
    updateSettings({ viewMode: { list: 'grid' as const, grid: 'tile' as const, tile: 'list' as const }[settings.viewMode] });
  }, [settings.viewMode, updateSettings]);

  const updateOpacity = useCallback((v: number) => {
    updateSettings({ opacity: v });
  }, [updateSettings]);

  useSyncElectron();

  const displaySymbols = useDisplaySymbols();
  const { loading: dataLoading, fetching, lastUpdated, refresh, progressRef, subscribeProgress } = useStockPrices(displaySymbols, settings.refreshInterval);
  const { items: marqueeItems } = useMarqueeData(settings.refreshInterval * 2);

  const openMarquee = useCallback((item: { code: string }) => {
    setHighlightCode(item.code);
    setSheet('marquee');
  }, [setHighlightCode, setSheet]);

  const addPreset = useStore(s => s.addPreset);
  const openSearch = useCallback(() => setSheet('search'), [setSheet]);
  const openSettings = useCallback(() => setSheet('settings'), [setSheet]);
  const openInvestor = useCallback(() => setSheet('investor'), [setSheet]);
  const openRanking = useCallback(() => setSheet('ranking'), [setSheet]);
  const openNews = useCallback(() => setSheet('news'), [setSheet]);
  const handleRefresh = useCallback(() => refresh(), [refresh]);
  const handleClose = useCallback(async () => {
    // 최초 1회만 안내. ESC/외부 클릭으로 닫으면 플래그 미설정 → 다음에 재안내.
    if (!localStorage.getItem(TRAY_HIDE_NOTICE_KEY)) {
      const ok = await confirm({
        title: '트레이로 숨어요',
        message: '앱을 완전히 종료하려면\n트레이 아이콘 "우클릭 → 종료"를 클릭하세요.',
        confirmText: '확인',
        hideCancel: true,
      });
      if (!ok) return;
      localStorage.setItem(TRAY_HIDE_NOTICE_KEY, '1');
    }
    window.electronAPI?.close();
  }, [confirm]);

  return (
    <>
      <Global styles={globalStyles(theme, isDark)} />
      <ScreenshotListener />
      <div css={s.app}>
        <OfflineBanner />
        <UpdateBanner />
        <TitleBar isDark={isDark} opacity={settings.opacity}
          onToggleTheme={toggleTheme}
          onOpacityChange={updateOpacity}
          onClose={handleClose} />

        <MarqueeTicker items={marqueeItems} speed={settings.tickerSpeed}
          onItemClick={openMarquee} />

        <PresetTabs presets={presets} activeId={activeId}
          onSelect={setActiveId} onRename={renamePreset} onRemove={removePreset} onAddPreset={addPreset}
          showAllTab currencyMode={settings.currencyMode} onCurrencyToggle={toggleCurrency}
          viewMode={settings.viewMode} onViewModeToggle={cycleViewMode} />

        <StockViewSwitch />

        <StatusBar lastUpdated={lastUpdated} loading={dataLoading}
          fetching={fetching}
          hasSymbols={displaySymbols.length > 0}
          progressRef={progressRef}
          subscribeProgress={subscribeProgress}
          onSearch={openSearch} onSettings={openSettings}
          onRefresh={handleRefresh}
          onInvestor={openInvestor}
          onRanking={openRanking}
          onNews={openNews} />

        <SheetManager marqueeItems={marqueeItems} />
      </div>
    </>
  );
};

const s = {
  app: css`
    height: 100vh; display: flex; flex-direction: column;
    background: ${sem.bg.base}; border-radius: 12px; overflow: hidden;
  `,
};
