/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, memo } from 'react';
import { FiTrash2, FiInfo, FiExternalLink, FiMenu } from 'react-icons/fi';
import { StockSymbol, StockPrice } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, transition, shadow, opacity } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { useSortableStyle } from '../hooks/useSortableStyle';
import { useSymbolRemove } from '../hooks/useSymbolRemove';
import { IconButton } from '@/shared/ui';
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

export const GridCard = memo(({
  sym, price: p, currencyMode, usdkrw,
  onRemove, onClick, onDetail,
}: Props) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const vm = useStockViewModel(sym, p, currencyMode, usdkrw);
  const flash = usePriceFlash(p, vm.direction);

  const { attributes, listeners, setNodeRef, style, isDragging } = useSortableStyle(sym.code);

  const tintDir = vm.direction;

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
      style={style}
      css={[s.card[tintDir], isDragging && s.dragging]}
      {...attributes}
    >
      <div css={s.actions} className="card-actions">
        <IconButton icon={<FiExternalLink size={11} />} size={22} onClick={handleClick} ariaLabel="외부 링크 열기" />
        {vm.hasPrice && (
          <IconButton icon={<FiInfo size={11} />} size={22} onClick={handleDetail} ariaLabel="상세 보기" />
        )}
        <IconButton icon={<FiTrash2 size={11} />} size={22} variant="danger" onClick={handleRemove} ariaLabel="종목 삭제" />
      </div>

      <div css={s.cardTop}>
        <div css={s.logoWrap} {...listeners}>
          {vm.logoUrl && !logoFailed ? (
            <img src={vm.logoUrl} alt="" css={s.logo} onError={() => setLogoFailed(true)} />
          ) : (
            <div css={s.fallback(vm.badge.bg, vm.badge.fg)}>{vm.displayName.charAt(0)}</div>
          )}
          <div css={s.handleOverlay} className="drag-handle"><FiMenu size={10} /></div>
        </div>
        <div css={s.nameArea}>
          <span css={s.name}>{vm.displayName}</span>
          <span css={s.codeTxt}>{vm.displayCode}</span>
        </div>
      </div>

      <div css={s.cardBottom}>
        {vm.hasPrice ? (
          <>
            <span css={[s.price, flash && priceFlash[flash]]}>{vm.priceLabel}</span>
            <span css={[s.change[vm.direction], flash && priceFlash[flash]]}>
              {vm.percentArrowLabel}
            </span>
          </>
        ) : (
          <span css={s.dots}>···</span>
        )}
      </div>

      {vm.hasPrice && (
        <span css={s.statusBadge[String(vm.isLive)]}>{vm.statusLabel}</span>
      )}
    </div>
  );
});

/* --- Styles --- */

const s = {
  card: (() => {
    const base = `
      position: relative; padding: ${spacing.lg}px;
      min-width: 0; overflow: hidden;
      background: ${sem.surface.card}; border: 1px solid ${sem.border.strong};
      border-radius: ${radius['2xl']}px; cursor: default;
      transition: background ${transition.fast}, box-shadow ${transition.fast};
      &:hover { background-color: ${sem.bg.surface}; box-shadow: ${sem.shadow.default}; }
      &:hover .card-actions { opacity: 1; }
      &:hover .drag-handle { opacity: 1; }
    `;
    return {
      up: css`${base}`,
      down: css`${base}`,
      flat: css`${base}`,
    };
  })() as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>,
  dragging: css`opacity: ${opacity.disabled}; z-index: 10; box-shadow: ${shadow.lg};`,
  actions: css`
    position: absolute; bottom: 6px; right: 6px; z-index: 3;
    display: flex; gap: ${spacing.xs}px; opacity: 0; transition: opacity ${transition.fast};
  `,
  cardTop: css`display: flex; align-items: center; gap: ${spacing.md}px; margin-bottom: ${spacing.md}px;`,
  logoWrap: css`
    position: relative; width: 24px; height: 24px; flex-shrink: 0;
    cursor: grab; touch-action: none;
    &:active { cursor: grabbing; }
  `,
  logo: css`
    width: 24px; height: 24px; border-radius: 50%; object-fit: cover;
    background: rgba(128,128,128,0.1); position: relative; z-index: 1;
  `,
  fallback: (bg: string, fg: string) => css`
    width: 24px; height: 24px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: ${bg}; color: ${fg}; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold};
  `,
  handleOverlay: css`
    position: absolute; inset: 0; border-radius: 50%; z-index: 2;
    display: flex; align-items: center; justify-content: center;
    background: ${sem.overlay.dim}; color: ${sem.text.inverse};
    opacity: 0; transition: opacity ${transition.fast};
  `,
  nameArea: css`display: flex; flex-direction: column; min-width: 0; flex: 1;`,
  name: css`
    font-size: ${fontSize.md}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  codeTxt: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary}; line-height: 1.2;`,
  cardBottom: css`display: flex; flex-direction: column; align-items: flex-start; gap: ${spacing.xs}px;`,
  price: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    font-variant-numeric: tabular-nums;
  `,
  change: makeDirectionalChange(fontSize.sm),
  dots: css`font-size: ${fontSize.lg}px; color: ${sem.text.tertiary};`,
  statusBadge: {
    true: css`position: absolute; bottom: ${spacing.md}px; right: ${spacing.md}px; font-size: 9px; font-weight: ${fontWeight.bold}; letter-spacing: 0.3px; color: ${sem.action.success};`,
    false: css`position: absolute; bottom: ${spacing.md}px; right: ${spacing.md}px; font-size: 9px; font-weight: ${fontWeight.bold}; letter-spacing: 0.3px; color: ${sem.text.tertiary};`,
  } as Record<string, ReturnType<typeof css>>,
};
