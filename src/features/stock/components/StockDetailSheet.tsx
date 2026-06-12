/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect } from 'react';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { useWebView } from '@/shared/hooks/useWebView';
import { FiX } from 'react-icons/fi';
import { StockSymbol, WebviewSource } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, height as h, zIndex, transition } from '@/shared/styles/tokens';
import { getNaverStockUrl } from '@/shared/naver';
import { getYahooStockUrl } from '@/shared/yahoo';
import { sem } from '@/shared/styles/semantic';
import { LoadingCenter } from '@/shared/ui/LoadingCenter';
import { ElectronWebView } from '@/shared/ui/ElectronWebView';

interface Props {
  symbol: StockSymbol | null;
  /** 웹뷰 소스 — 데이마켓에서 야후 선택 시 'yahoo'. 기본 네이버. */
  source?: WebviewSource;
  onClose: () => void;
}

export const StockDetailSheet = ({ symbol, source = 'naver', onClose }: Props) => {
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
  // 우측 서브타이틀 — 종목 코드 (해외는 reutersCode 우선)
  const codeLabel = symbol.reutersCode || symbol.code;

  return (
    <div css={s.overlay}>
      <div css={s.sheet}>
        <div css={s.nav}>
          <button css={s.closeBtn} onClick={onClose} aria-label="닫기"><FiX size={16} /></button>
          <span css={s.title}>{displayName}</span>
          <span css={s.sub}>{codeLabel}</span>
        </div>
        {!loaded && (
          <div css={s.loading}>
            <LoadingCenter label="페이지를 불러오는 중..." />
          </div>
        )}
        <div css={s.wv} style={{ opacity: loaded ? 1 : 0 }}>
          {/* 야후 티커 변환 실패(null) 시 네이버 폴백 */}
          <ElectronWebView ref={wvRef}
            src={(source === 'yahoo' && getYahooStockUrl(symbol)) || getNaverStockUrl(symbol)} />
        </div>
      </div>
    </div>
  );
};

const s = {
  overlay: css`position:fixed;inset:0;z-index:${zIndex.modal};display:flex;flex-direction:column;border-radius:${radius['2xl']}px;overflow:hidden;`,
  sheet: css`flex:1;background:${sem.bg.base};display:flex;flex-direction:column;border-radius:${radius['2xl']}px;overflow:hidden;`,
  nav: css`display:flex;align-items:center;height:${h.nav}px;padding:0 ${spacing.lg}px;border-bottom:1px solid ${sem.border.subtle};gap:${spacing.md}px;flex-shrink:0;-webkit-app-region:drag;`,
  title: css`font-size:${fontSize.xl}px;font-weight:${fontWeight.bold};line-height:0;color:${sem.text.primary};display:flex;align-items:center;`,
  sub: css`font-size:${fontSize.md}px;color:${sem.text.tertiary};margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:50%;text-align:right;`,
  closeBtn: css`
    border:none;background:transparent;cursor:pointer;color:${sem.text.secondary};
    padding:${spacing.sm}px ${spacing.md - 2}px;border-radius:${radius.md}px;display:flex;flex-shrink:0;
    -webkit-app-region:no-drag;&:hover{background:${sem.bg.surface};color:${sem.text.primary};}
  `,
  loading: css`flex:1;display:flex;align-items:center;justify-content:center;`,
  wv: css`flex:1;display:flex;transition:opacity ${transition.normal};`,
};
