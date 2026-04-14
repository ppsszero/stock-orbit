/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiTrash2, FiBarChart2, FiExternalLink, FiMenu } from 'react-icons/fi';
import { StockSymbol, StockPrice } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/Toast';
import { sem } from '@/shared/styles/semantic';

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
  const confirm = useConfirm();
  const toast = useToast();
  const vm = useStockViewModel(sym, p, currencyMode, usdkrw);

  const {
    attributes, listeners, setNodeRef,
    transform, transition: sortTransition, isDragging,
  } = useSortable({ id: sym.code });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: sortTransition ?? undefined,
  };

  const tintDir = vm.direction;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(sym);
  }, [onClick, sym]);
  const handleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (p) onDetail(sym, p);
  }, [onDetail, sym, p]);
  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: `"${vm.displayName}" 삭제`,
      message: '이 종목을 관심목록에서 삭제할까요?',
      confirmText: '삭제', cancelText: '취소', danger: true,
    });
    if (ok) {
      onRemove(sym.code);
      toast.show(`"${vm.displayName}" 종목을 삭제했어요.`, 'delete');
    }
  }, [onRemove, sym.code, confirm, vm.displayName, toast]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      css={[s.card[tintDir], isDragging && s.dragging]}
      {...attributes}
    >
      <div css={s.actions} className="card-actions">
        <button css={s.actionBtn} onClick={handleClick} aria-label="외부 링크 열기">
          <FiExternalLink size={11} />
        </button>
        {vm.hasPrice && (
          <button css={s.actionBtn} onClick={handleDetail} aria-label="차트 보기">
            <FiBarChart2 size={11} />
          </button>
        )}
        <button css={s.delBtn} onClick={handleRemove} aria-label="종목 삭제">
          <FiTrash2 size={11} />
        </button>
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
            <span css={s.price}>{vm.priceLabel}</span>
            <span css={s.change[vm.direction]}>
              {vm.arrowLabel}{vm.percentLabel}
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
      up: css`${base} background-image: linear-gradient(135deg, ${sem.feedback.up}08 0%, transparent 60%);`,
      down: css`${base} background-image: linear-gradient(135deg, ${sem.feedback.down}08 0%, transparent 60%);`,
      flat: css`${base}`,
    };
  })() as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>,
  dragging: css`opacity: 0.5; z-index: 10; box-shadow: 0 4px 16px rgba(0,0,0,0.2);`,
  actions: css`
    position: absolute; top: 6px; right: 6px; z-index: 3;
    display: flex; gap: ${spacing.xs}px; opacity: 0; transition: opacity ${transition.fast};
  `,
  actionBtn: css`
    width: 22px; height: 22px; border: none; border-radius: ${radius.md}px;
    background: ${sem.action.primaryHover}; color: ${sem.action.primary};
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    &:hover { background: ${sem.action.primaryMedium}; }
  `,
  delBtn: css`
    width: 22px; height: 22px; border: none; border-radius: ${radius.md}px;
    background: ${sem.action.dangerTint}; color: ${sem.action.danger};
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    &:hover { background: ${sem.action.dangerBorder}; }
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
    background: rgba(0,0,0,0.5); color: #fff;
    opacity: 0; transition: opacity ${transition.fast};
  `,
  nameArea: css`display: flex; flex-direction: column; min-width: 0; flex: 1;`,
  name: css`
    font-size: ${fontSize.md}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  codeTxt: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary}; line-height: 1.2;`,
  cardBottom: css`display: flex; flex-direction: column; gap: ${spacing.xs}px;`,
  price: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    font-variant-numeric: tabular-nums;
  `,
  change: {
    up: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.up};`,
    down: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.down};`,
    flat: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.flat};`,
  } as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>,
  dots: css`font-size: ${fontSize.lg}px; color: ${sem.text.tertiary};`,
  statusBadge: {
    true: css`position: absolute; bottom: ${spacing.md}px; right: ${spacing.md}px; font-size: 9px; font-weight: ${fontWeight.bold}; letter-spacing: 0.3px; color: ${sem.action.success};`,
    false: css`position: absolute; bottom: ${spacing.md}px; right: ${spacing.md}px; font-size: 9px; font-weight: ${fontWeight.bold}; letter-spacing: 0.3px; color: ${sem.text.tertiary};`,
  } as Record<string, ReturnType<typeof css>>,
};
