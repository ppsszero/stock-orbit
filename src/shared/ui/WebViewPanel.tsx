/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiX, FiLoader } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, height, transition } from '@/shared/styles/tokens';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { useWebView } from '@/shared/hooks/useWebView';
import { sem } from '@/shared/styles/semantic';
import { spinCss } from './LoadingCenter';

interface Props {
  url: string | null;
  title?: string;
  onClose: () => void;
}

export const WebViewPanel = ({ url, title = '종목 상세', onClose }: Props) => {
  useBackAction(!!url, onClose);
  const { wvRef, loaded } = useWebView(!!url);

  if (!url) return null;

  return (
    <div css={s.overlay}>
      <div css={s.sheet}>
        <div css={s.nav}>
          <button css={s.closeBtn} onClick={onClose}>
            <FiX size={16} />
          </button>
          <span css={s.title}>{title}</span>
        </div>
        {!loaded && (
          <div css={s.loading}>
            <FiLoader size={20} css={s.spin} />
          </div>
        )}
        <div css={s.wvWrap} style={{ opacity: loaded ? 1 : 0 }}>
          <webview
            ref={wvRef as React.Ref<HTMLElement>}
            src={url}
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
  overlay: css`
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    border-radius: ${radius['2xl']}px;
    overflow: hidden;
  `,
  sheet: css`
    flex: 1;
    background: ${sem.bg.base};
    display: flex;
    flex-direction: column;
  `,
  nav: css`
    display: flex;
    align-items: center;
    height: ${height.nav}px;
    padding: 0 ${spacing.lg}px;
    border-bottom: 1px solid ${sem.border.default};
    gap: ${spacing.md}px;
    flex-shrink: 0;
    -webkit-app-region: drag;
  `,
  closeBtn: css`
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${sem.text.secondary};
    padding: ${spacing.sm}px 6px;
    border-radius: ${radius.md}px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    -webkit-app-region: no-drag;
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
  `,
  title: css`
    font-size: ${fontSize.xl}px;
    font-weight: ${fontWeight.bold};
    color: ${sem.text.primary};
    flex: 1;
  `,
  loading: css`
    display: flex;
    justify-content: center;
    align-items: center;
    flex: 1;
    color: ${sem.text.tertiary};
  `,
  spin: spinCss,
  wvWrap: css`
    flex: 1;
    display: flex;
    transition: opacity ${transition.normal};
  `,
  webview: css`flex: 1; border: none;`,
};
