/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiTrash2, FiMenu, FiBarChart2, FiExternalLink } from 'react-icons/fi';
import { StockSymbol, StockPrice } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, transition, zIndex , sp } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { Badge, StatusDot, StockLogo, IconButton } from '@/shared/ui';
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

export const StockRow = memo(({
  sym, price: p, currencyMode, usdkrw,
  onRemove, onClick, onDetail,
}: Props) => {
  const [hovered, setHovered] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const vm = useStockViewModel(sym, p, currencyMode, usdkrw);

  // NOTE: setNodeRef → 행 전체, listeners → 로고 영역에만 적용.
  // 행 전체가 드래그되면 클릭/호버 이벤트와 충돌하므로 핸들을 로고로 제한.
  const {
    attributes, listeners, setNodeRef,
    transform, transition: sortTransition, isDragging,
  } = useSortable({ id: sym.code });

  // WARNING: Emotion css와 style의 transform이 충돌하면 안 됨 — css에는 transform 사용 금지.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: sortTransition ?? undefined,
  };

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
          <Badge bg={vm.badge.bg} fg={vm.badge.fg}>{sym.nation}</Badge>
          {vm.exchange && <Badge bg={sem.bg.elevated} fg={sem.text.tertiary}>{vm.exchange}</Badge>}
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
            <IconButton icon={<FiBarChart2 size={13} />} size={28} onClick={handleDetail} ariaLabel="차트 보기" />
            <IconButton icon={<FiTrash2 size={13} />} size={28} variant="danger" onClick={handleRemove} ariaLabel="종목 삭제" />
          </div>
        ) : vm.hasPrice ? (
          <>
            <span css={s.price}>{vm.priceLabel}</span>
            <span css={s.change[vm.direction]}>{vm.changeLabel}</span>
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
  dragging: css`opacity: 0.5; z-index: 10; box-shadow: 0 4px 16px rgba(0,0,0,0.2);`,
  logoWrap: css`
    position: relative; width: ${spacing['4xl']}px; height: ${spacing['4xl']}px; flex-shrink: 0; margin-right: ${sp('md', 'xs')};
    cursor: grab; touch-action: none;
    &:active { cursor: grabbing; }
  `,
  handleOverlay: css`
    position: absolute; inset: 0; border-radius: 50%; z-index: ${zIndex.base};
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.5); color: #fff;
    opacity: 0; transition: opacity ${transition.fast};
  `,
  left: css`display: flex; flex-direction: column; gap: ${spacing.xs}px; min-width: 0; flex: 1;`,
  nameRow: css`display: flex; align-items: center; gap: ${radius.md}px;`,
  name: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  sub: css`display: flex; align-items: center; gap: ${radius.md}px;`,
  code: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; font-variant-numeric: tabular-nums; line-height: 1;`,
  right: css`display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: ${spacing.xs}px; flex-shrink: 0; min-width: 100px; min-height: 38px;`,
  price: css`font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  // 사전 계산 — 매 렌더마다 css() 호출 방지
  change: {
    up: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.up};`,
    down: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.down};`,
    flat: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.flat};`,
  } as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>,
  dots: css`font-size: ${fontSize.lg}px; color: ${sem.text.tertiary};`,
  hoverActions: css`display: flex; align-items: center; gap: ${spacing.sm}px;`,
};
