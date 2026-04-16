/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect } from 'react';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { useWebView } from '@/shared/hooks/useWebView';
import { FiX, FiLoader } from 'react-icons/fi';
import { StockSymbol } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, height as h, zIndex, transition } from '@/shared/styles/tokens';
import { getNaverStockUrl } from '@/shared/naver';
import { sem } from '@/shared/styles/semantic';
import { spinCss } from '@/shared/ui/LoadingCenter';

interface Props { symbol: StockSymbol | null; onClose: () => void; }

export const StockDetailSheet = ({ symbol, onClose }: Props) => {
  useBackAction(!!symbol, onClose);
  const { wvRef, loaded } = useWebView(!!symbol);

  // 호스트에 포커스가 있을 때 F5 → 웹뷰 새로고침 (IPC 경유)
  useEffect(() => {
    if (!symbol) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        window.electronAPI?.reloadWebview();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [symbol]);

  if (!symbol) return null;

  const displayName = symbol.nation !== 'KR' && !/[가-힣]/.test(symbol.name) && symbol.code
    ? symbol.code : symbol.name;

  return (
    <div css={s.overlay}>
      <div css={s.sheet}>
        <div css={s.nav}>
          <button css={s.closeBtn} onClick={onClose} aria-label="닫기"><FiX size={16} /></button>
          <span css={s.title}>Npay 증권</span>
          <span css={s.sub}>{displayName}</span>
        </div>
        {!loaded && (
          <div css={s.loading}>
            <FiLoader size={20} css={s.spin} />
            <span>페이지 로딩 중...</span>
          </div>
        )}
        <div css={s.wv} style={{ opacity: loaded ? 1 : 0 }}>
          <webview
            ref={wvRef as React.Ref<HTMLElement>}
            src={getNaverStockUrl(symbol)}
            css={s.webview}
            allowpopups="true"
            useragent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
          />
        </div>
      </div>
    </div>
  );
};

const s = {
  overlay: css`position:fixed;inset:0;z-index:${zIndex.modal};display:flex;flex-direction:column;border-radius:${radius['2xl']}px;overflow:hidden;`,
  sheet: css`flex:1;background:${sem.bg.base};display:flex;flex-direction:column;border-radius:${radius['2xl']}px;overflow:hidden;`,
  nav: css`display:flex;align-items:center;height:${h.nav}px;padding:0 ${spacing.lg}px;border-bottom:1px solid ${sem.border.default};gap:${spacing.md}px;flex-shrink:0;-webkit-app-region:drag;`,
  title: css`font-size:${fontSize.xl}px;font-weight:${fontWeight.bold};color:${sem.text.primary};`,
  sub: css`font-size:${fontSize.md}px;color:${sem.text.tertiary};margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:50%;text-align:right;`,
  closeBtn: css`
    border:none;background:transparent;cursor:pointer;color:${sem.text.secondary};
    padding:${spacing.sm}px ${spacing.md - 2}px;border-radius:${radius.md}px;display:flex;flex-shrink:0;
    -webkit-app-region:no-drag;&:hover{background:${sem.bg.surface};color:${sem.text.primary};}
  `,
  loading: css`
    flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${spacing.md + 2}px;
    color:${sem.text.tertiary};font-size:${fontSize.base}px;
  `,
  spin: spinCss,
  wv: css`flex:1;display:flex;transition:opacity ${transition.normal};`,
  webview: css`flex:1;border:none;`,
};
