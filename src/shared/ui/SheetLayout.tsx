/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { FiArrowLeft, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, height, transition } from '@/shared/styles/tokens';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { sem } from '@/shared/styles/semantic';
import { spinCss } from './LoadingCenter';

interface Props {
  open: boolean;
  title: string;
  zIndex?: number;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  navRight?: ReactNode;
  children: ReactNode;
}

export const SheetLayout = ({
  open, title, zIndex = 550,
  onClose, onRefresh, refreshing, navRight, children,
}: Props) => {
  useBackAction(open, onClose);

  if (!open) return null;

  return (
    <div css={s.overlay(zIndex)}>
      <div css={s.sheet}>
        <div css={s.nav}>
          <button css={[s.navBtn, s.back]} onClick={onClose}>
            <FiArrowLeft size={18} />
          </button>
          <span css={s.title}>{title}</span>
          {onRefresh && (
            <button css={[s.navBtn, s.refreshBtn]} onClick={onRefresh}>
              <FiRefreshCw size={14} css={refreshing && s.spinning} />
            </button>
          )}
          {navRight}
        </div>
        {children}
      </div>
    </div>
  );
};

const s = {
  overlay: (z: number) => css`
    position: fixed;
    inset: 0;
    z-index: ${z};
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
    border-radius: ${radius['2xl']}px;
    overflow: hidden;
  `,
  nav: css`
    display: flex;
    align-items: center;
    height: ${height.nav}px;
    padding: 0 ${spacing.md + 2}px;
    border-bottom: 1px solid ${sem.border.default};
    gap: ${spacing.md}px;
    flex-shrink: 0;
    -webkit-app-region: drag;
  `,
  // 백·새로고침 버튼 공통 — 아이콘 크기가 달라도 동일 높이/정렬 유지.
  // hover 피드백은 배경이 아닌 컬러 변화로 처리 (아이콘 여백/정렬 간섭 방지).
  navBtn: css`
    height: 28px;
    min-width: 28px;
    padding: 0 ${spacing.md - 2}px;
    border: none;
    background: transparent;
    border-radius: ${radius.md}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-app-region: no-drag;
    transition: color ${transition.fast};
  `,
  back: css`
    color: ${sem.text.primary};
    &:hover { color: ${sem.action.primary}; }
  `,
  title: css`
    font-size: 15px;
    font-weight: 700;
    line-height: 0;
    color: ${sem.text.primary};
    flex: 1;
    display: flex;
    align-items: center;
  `,
  refreshBtn: css`
    color: ${sem.text.secondary};
    &:hover { color: ${sem.action.primary}; }
  `,
  spinning: spinCss,
};
