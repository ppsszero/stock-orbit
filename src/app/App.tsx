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
import { ConfirmProvider } from '@/shared/ui/ConfirmDialog';
import { MarqueeTicker } from '@/features/marquee';
import { PresetTabs } from '@/features/preset';
import { ScreenshotListener } from './ScreenshotListener';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { UpdateBanner } from '@/shared/ui/UpdateBanner';
import { sem } from '@/shared/styles/semantic';

export const App = () => {
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
  const { loading: dataLoading, lastUpdated, refresh } = useStockPrices(displaySymbols, settings.refreshInterval);
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
  const handleMinimize = useCallback(() => window.electronAPI?.minimize(), []);
  const handleClose = useCallback(() => window.electronAPI?.close(), []);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Global styles={globalStyles(theme, isDark)} />
        <ScreenshotListener />
        <div css={s.app}>
          <OfflineBanner />
          <UpdateBanner />
          <TitleBar isDark={isDark} opacity={settings.opacity}
            onToggleTheme={toggleTheme}
            onOpacityChange={updateOpacity}
            onMinimize={handleMinimize}
            onClose={handleClose} />

          <MarqueeTicker items={marqueeItems} speed={settings.tickerSpeed}
            onItemClick={openMarquee} />

          <PresetTabs presets={presets} activeId={activeId}
            onSelect={setActiveId} onRename={renamePreset} onRemove={removePreset} onAddPreset={addPreset}
            showAllTab currencyMode={settings.currencyMode} onCurrencyToggle={toggleCurrency}
            viewMode={settings.viewMode} onViewModeToggle={cycleViewMode} />

          <StockViewSwitch />

          <StatusBar lastUpdated={lastUpdated} loading={dataLoading}
            hasSymbols={displaySymbols.length > 0}
            onSearch={openSearch} onSettings={openSettings}
            onRefresh={handleRefresh}
            onInvestor={openInvestor}
            onRanking={openRanking}
            onNews={openNews} />

          <SheetManager marqueeItems={marqueeItems} />
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
};

const s = {
  app: css`
    height: 100vh; display: flex; flex-direction: column;
    background: ${sem.bg.base}; border-radius: 12px; overflow: hidden;
  `,
};
