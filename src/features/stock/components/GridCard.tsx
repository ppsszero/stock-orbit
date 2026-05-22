/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, memo } from 'react';
import { FiInfo, FiEdit2 } from 'react-icons/fi';
import { useStore } from '@/app/store';
import { StockSymbol, StockPrice } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { Menu } from '@/shared/ui';
import { EditSymbolsSheet } from '@/features/preset';
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
  onClick, onDetail,
}: Props) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const presets = useStore(s => s.presets);
  const activeId = useStore(s => s.activeId);
  const vm = useStockViewModel(sym, p, currencyMode, usdkrw);
  const flash = usePriceFlash(p, vm.direction);

  const tintDir = vm.direction;

  const handleCardClick = useCallback(() => {
    onClick(sym);
  }, [onClick, sym]);
  const handleDetail = useCallback(() => {
    if (p) onDetail(sym, p);
    setCtxPos(null);
  }, [onDetail, sym, p]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxPos({ x: e.clientX, y: e.clientY });
  }, []);
  const closeCtx = useCallback(() => setCtxPos(null), []);

  const openEdit = useCallback(() => {
    setCtxPos(null);
    setEditOpen(true);
  }, []);
  const closeEdit = useCallback(() => setEditOpen(false), []);
  // 우클릭한 카드의 종목이 실제로 속한 그룹 우선 (전체 탭에서 activeId='__all__' 매칭 실패 사고 방지)
  const editPreset = presets.find(p => p.symbols.some(s => s.code === sym.code))
    ?? presets.find(p => p.id === activeId)
    ?? presets[0];

  return (
    <div
      css={s.card[tintDir]}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
    >
      <Menu open={!!ctxPos}
        anchorPoint={ctxPos ?? { x: 0, y: 0 }}
        onClose={closeCtx}>
        {vm.hasPrice && (
          <Menu.Item icon={<FiInfo size={13} />} onClick={handleDetail}>
            상세 정보 보기
          </Menu.Item>
        )}
        <Menu.Item icon={<FiEdit2 size={13} />} onClick={openEdit}>
          편집
        </Menu.Item>
      </Menu>

      {editPreset && (
        <EditSymbolsSheet
          open={editOpen}
          preset={editPreset}
          presets={presets}
          onClose={closeEdit}
        />
      )}

      <div css={s.cardTop}>
        <div css={s.logoWrap}>
          {vm.logoUrl && !logoFailed ? (
            <img src={vm.logoUrl} alt="" css={s.logo} onError={() => setLogoFailed(true)} />
          ) : (
            <div css={s.fallback(vm.badge.bg, vm.badge.fg)}>{vm.displayName.charAt(0)}</div>
          )}
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
      background: ${sem.surface.card}; border: none;
      border-radius: ${radius['2xl']}px; cursor: pointer;
      transition: background ${transition.fast}, box-shadow ${transition.fast};
      &:hover { background-color: ${sem.bg.surface}; box-shadow: ${sem.shadow.default}; }
    `;
    return {
      up: css`${base}`,
      down: css`${base}`,
      flat: css`${base}`,
    };
  })() as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>,
  cardTop: css`display: flex; align-items: center; gap: ${spacing.md}px; margin-bottom: ${spacing.md}px;`,
  logoWrap: css`
    width: 24px; height: 24px; flex-shrink: 0;
  `,
  logo: css`
    width: 24px; height: 24px; border-radius: 50%; object-fit: cover;
    background: rgba(128,128,128,0.1);
  `,
  fallback: (bg: string, fg: string) => css`
    width: 24px; height: 24px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: ${bg}; color: ${fg}; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold};
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
