/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, useEffect, memo } from 'react';
import { FiTrash2, FiMenu, FiInfo, FiExternalLink } from 'react-icons/fi';
import { StockSymbol, StockPrice, inferCategory } from '@/shared/types';
import { spacing, fontSize, fontWeight, transition, zIndex, shadow, sp, opacity } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { useSortableStyle } from '../hooks/useSortableStyle';
import { useSymbolRemove } from '../hooks/useSymbolRemove';
import { Badge, StatusDot, StockLogo, IconButton } from '@/shared/ui';
import { CATEGORY_BADGE } from '@/shared/utils/format';
import { sem } from '@/shared/styles/semantic';
import { priceFlash, makeDirectionalChange } from '@/shared/styles/sharedStyles';

interface Props {
  sym: StockSymbol;
  price: StockPrice | undefined;
  currencyMode: 'KRW' | 'USD';
  usdkrw: number;
  onRemove: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
}

export const StockRow = memo(({
  sym, price: p, currencyMode, usdkrw,
  onRemove, onClick, onDetail,
}: Props) => {
  const [hovered, setHovered] = useState(false);
  const vm = useStockViewModel(sym, p, currencyMode, usdkrw);
  const flash = usePriceFlash(p, vm.direction);

  // 데이터 갱신(가격 변경) 시 hover 유령 상태 방지:
  // DOM 재배치로 mouseLeave가 누락될 수 있으므로 강제 리셋.
  // 실제로 마우스가 위에 있으면 mouseEnter가 즉시 다시 발생하여 복원됨.
  useEffect(() => {
    if (hovered) setHovered(false);
  }, [p]); // hovered 의도적 제외 — p 변경 시에만 리셋

  // NOTE: setNodeRef → 행 전체, listeners → 로고 영역에만 적용.
  // 행 전체가 드래그되면 클릭/호버 이벤트와 충돌하므로 핸들을 로고로 제한.
  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableStyle(sym.code);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(sym);
  }, [onClick, sym]);

  const handleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (p) onDetail(sym, p);
  }, [onDetail, sym, p]);

  const handleRemove = useSymbolRemove(sym, vm.displayName, onRemove);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      role="listitem"
      style={style}
      css={[s.row, isDragging && s.dragging]}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div css={s.logoWrap} {...listeners}>
        <StockLogo
          src={vm.logoUrl}
          fallbackChar={vm.displayName.charAt(0)}
          fallbackBg={vm.badge.bg} fallbackFg={vm.badge.fg}
          size={spacing['4xl']}
        />
        <div css={s.handleOverlay} className="drag-handle"><FiMenu size={12} /></div>
      </div>

      <div css={s.left}>
        <div css={s.nameRow}>
          <span css={s.name}>{vm.displayName}</span>
          <div css={s.badges}>
            {vm.nation !== 'INT' && <Badge bg={vm.badge.bg} fg={vm.badge.fg}>{vm.nation}</Badge>}
            {(() => {
              const cat = inferCategory(sym);
              const cb = CATEGORY_BADGE[cat];
              if (cb) return <Badge bg={cb.bg} fg={cb.fg}>{cat === 'index' ? '지수' : '선물'}</Badge>;
              return null;
            })()}
            {vm.exchange && <Badge bg={sem.bg.elevated} fg={sem.text.tertiary}>{vm.exchange}</Badge>}
          </div>
        </div>
        <div css={s.sub}>
          <span css={s.code}>{vm.displayCode}</span>
          {vm.hasPrice && (
            vm.isTradingHalt
              ? <StatusDot color={sem.action.danger} label="거래정지" />
              : <StatusDot color={vm.isLive ? sem.action.success : sem.text.tertiary} label={vm.statusLabel} />
          )}
        </div>
      </div>

      <div css={s.right}>
        {hovered && vm.hasPrice ? (
          <div css={s.hoverActions}>
            <IconButton icon={<FiExternalLink size={13} />} size={28} onClick={handleClick} ariaLabel="외부 링크 열기" />
            <IconButton icon={<FiInfo size={13} />} size={28} onClick={handleDetail} ariaLabel="상세 보기" />
            <IconButton icon={<FiTrash2 size={13} />} size={28} variant="danger" onClick={handleRemove} ariaLabel="종목 삭제" />
          </div>
        ) : vm.hasPrice ? (
          <>
            <span css={[s.price, flash && priceFlash[flash]]}>{vm.priceLabel}</span>
            <span css={[s.change[vm.direction], flash && priceFlash[flash]]}>{vm.changeLabel}</span>
          </>
        ) : (
          <span css={s.dots}>···</span>
        )}
      </div>
    </div>
  );
});

/* --- Styles --- */

const s = {
  row: css`
    display: flex; align-items: center; justify-content: space-between;
    padding: ${sp('md', 'xs')} ${spacing.md}px; border-bottom: 1px solid ${sem.border.faint}; cursor: default;
    background: ${sem.bg.base};
    &:hover { background: ${sem.bg.surface}; }
    &:hover .drag-handle { opacity: 1; }
  `,
  dragging: css`opacity: ${opacity.disabled}; z-index: 10; box-shadow: ${shadow.lg};`,
  logoWrap: css`
    position: relative; width: ${spacing['4xl']}px; height: ${spacing['4xl']}px; flex-shrink: 0; margin-right: ${sp('md', 'xs')};
    cursor: grab; touch-action: none;
    &:active { cursor: grabbing; }
  `,
  handleOverlay: css`
    position: absolute; inset: 0; border-radius: 50%; z-index: ${zIndex.base};
    display: flex; align-items: center; justify-content: center;
    background: ${sem.overlay.dim}; color: ${sem.text.inverse};
    opacity: 0; transition: opacity ${transition.fast};
  `,
  left: css`display: flex; flex-direction: column; gap: ${spacing.xs}px; min-width: 0; flex: 1;`,
  nameRow: css`display: flex; align-items: center; gap: ${spacing.sm + spacing.xs}px;`,
  badges: css`display: flex; align-items: center; gap: ${spacing.xs}px;`,
  name: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  sub: css`display: flex; align-items: center; gap: ${spacing.md}px;`,
  code: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; font-variant-numeric: tabular-nums; line-height: 1;`,
  right: css`display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: ${spacing.xs}px; flex-shrink: 0; min-width: 100px; min-height: 38px;`,
  price: css`font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  change: makeDirectionalChange(fontSize.sm),
  dots: css`font-size: ${fontSize.lg}px; color: ${sem.text.tertiary};`,
  hoverActions: css`display: flex; align-items: center; gap: ${spacing.sm}px;`,
};
