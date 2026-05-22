/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ReactNode, useEffect, useState } from 'react';
import { FiArrowLeft, FiRefreshCw, FiLoader } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, height, transition } from '@/shared/styles/tokens';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { fmtRelativeTime } from '@/shared/utils/format';
import { sem } from '@/shared/styles/semantic';
import { spinCss } from './LoadingCenter';
import { Tooltip } from './Tooltip';
import { useToast } from './Toast';

interface Props {
  open: boolean;
  title: string;
  zIndex?: number;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** 마지막 갱신 시각 — 새로고침 버튼 hover 시 "5분 전" 식 툴팁 표시 */
  lastUpdatedAt?: Date | null;
  navRight?: ReactNode;
  /** 시트 본문 시작이 Tabs 등 자체 border를 가진 컴포넌트일 때 nav 아래 라인 중복 방지 */
  noNavBorder?: boolean;
  children: ReactNode;
}

const REFRESH_COOLDOWN_MS = 30_000;

export const SheetLayout = ({
  open, title, zIndex = 550,
  onClose, onRefresh, refreshing, lastUpdatedAt, navRight, noNavBorder, children,
}: Props) => {
  useBackAction(open, onClose);
  const toast = useToast();

  // 새로고침 cooldown — 마지막 갱신 후 30초 안에는 재요청 차단
  const [tick, setTick] = useState(0);
  const elapsed = lastUpdatedAt ? Date.now() - lastUpdatedAt.getTime() : Infinity;
  const cooldown = elapsed < REFRESH_COOLDOWN_MS;
  const cooldownRemainSec = cooldown ? Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000) : 0;
  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setTick(t => t + 1), REFRESH_COOLDOWN_MS - elapsed);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdatedAt, tick]);

  const handleRefreshClick = () => {
    if (refreshing) return;
    if (cooldown) {
      toast.show(`${cooldownRemainSec}초 뒤에 다시 시도해주세요`, 'error');
      return;
    }
    onRefresh?.();
  };

  if (!open) return null;

  // 시트는 portal을 쓰지 않으므로 React 트리상 부모(예: StockRow)로 이벤트가 버블링됨.
  // 부모의 onClick / onContextMenu(예: 종목 행 클릭 → 웹뷰) 발화를 막기 위해 root에서 차단.
  // NOTE: onMouseDown/onPointerDown은 차단하지 않음 — React stopPropagation은 native까지 막아서
  // document에 등록된 mousedown 리스너(예: useOutsideClick)가 트리거되지 않게 됨.
  // 메뉴 외부 클릭 닫힘이 깨지므로 click/contextmenu만 막아 균형을 맞춤.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <div css={s.overlay(zIndex)}
      onClick={stop}
      onContextMenu={stop}>
      <div css={s.sheet}>
        <div css={s.nav(!!noNavBorder)}>
          <button css={[s.navBtn, s.back]} onClick={onClose}>
            <FiArrowLeft size={18} />
          </button>
          <span css={s.title}>{title}</span>
          {onRefresh && (
            <Tooltip
              content={lastUpdatedAt ? `${fmtRelativeTime(lastUpdatedAt)} 갱신` : '새로고침'}
              position="bottom" display="inline-flex">
              <button css={[s.navBtn, s.refreshBtn(cooldown || !!refreshing)]} onClick={handleRefreshClick}>
                <FiRefreshCw size={14} css={refreshing && s.spinning} />
              </button>
            </Tooltip>
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
  nav: (noBorder: boolean) => css`
    display: flex;
    align-items: center;
    height: ${height.nav}px;
    padding: 0 ${spacing.md + 2}px;
    ${noBorder ? '' : `border-bottom: 1px solid ${sem.border.subtle};`}
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
    font-size: ${fontSize.xl}px;
    font-weight: 700;
    line-height: 0;
    color: ${sem.text.primary};
    flex: 1;
    display: flex;
    align-items: center;
  `,
  // 비활성 시각 처리 — disabled attribute는 쓰지 않음 (클릭 토스트 띄우려면 onClick이 발화해야 함)
  refreshBtn: (muted: boolean) => css`
    color: ${sem.text.secondary};
    ${muted ? `opacity: 0.4;` : `&:hover { color: ${sem.action.primary}; }`}
  `,
  spinning: spinCss,
};
