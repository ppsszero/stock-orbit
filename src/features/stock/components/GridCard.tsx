/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, memo } from 'react';
import { FiInfo, FiTrash2 } from 'react-icons/fi';
import { useStore } from '@/app/store';
import { StockSymbol, StockPrice } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { useSymbolRemove } from '../hooks/useSymbolRemove';
import { useIsTruncated } from '@/shared/hooks/useIsTruncated';
import { Menu, ReorderIcon, StatusDot, Tooltip } from '@/shared/ui';
import { EditSymbolsSheet } from '@/features/preset';
import { sem } from '@/shared/styles/semantic';
import { priceFlash, makeDirectionalChange } from '@/shared/styles/sharedStyles';
import { isDaymarketCapable } from '@/shared/yahoo';

interface Props {
  sym: StockSymbol;
  price: StockPrice | undefined;
  currencyMode: 'KRW' | 'USD';
  usdkrw: number;
  onRemove: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
  daymarketConnecting?: boolean;
}

export const GridCard = memo(({
  sym, price: p, currencyMode, usdkrw,
  onRemove, onClick, onDetail, daymarketConnecting = false,
}: Props) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const presets = useStore(s => s.presets);
  const activeId = useStore(s => s.activeId);
  const vm = useStockViewModel(sym, p, currencyMode, usdkrw);
  const flash = usePriceFlash(p, vm.direction);
  // 데이마켓 진행 중 + US + 아직 장마감 + 데이마켓 가능 종목 → StatusDot 펄스 '연결중'
  // 가능 판단 = 네이버 시간외 정보(시간대 따라 사라짐) OR 학습된 이력(오버나잇 데이터 받은 적 있음 — 안 흔들림).
  // SQLT처럼 둘 다 아닌 종목은 펄스 없이 '장마감'.
  const isDmLoading = daymarketConnecting && sym.nation === 'US' && p?.marketStatus === 'CLOSED'
    && (p?.hasExtendedHours === true || isDaymarketCapable(sym.code));

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

  // 우클릭 메뉴 "삭제" — confirm dialog + toast 자동 처리
  const handleRemove = useSymbolRemove(sym, vm.displayName, onRemove);

  // 이름 ellipsis 시에만 Tooltip 표시
  const { ref: nameRef, truncated } = useIsTruncated(vm.displayName);

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
        <Menu.Item icon={<ReorderIcon size={13} />} onClick={openEdit}>
          편집
        </Menu.Item>
        <Menu.Item icon={<FiTrash2 size={13} />} variant="danger"
          onClick={() => { handleRemove(); closeCtx(); }}>
          삭제
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
          <Tooltip content={truncated ? vm.displayName : ''} position="top" delay={300}>
            <span ref={nameRef} css={s.name}>{vm.displayName}</span>
          </Tooltip>
          <div css={s.codeRow}>
            <span css={s.codeTxt}>{vm.displayCode}</span>
            {vm.hasPrice && (
              vm.isTradingHalt
                ? <StatusDot color={sem.action.danger} label="거래정지" />
                : isDmLoading
                  ? <StatusDot color={sem.text.secondary} label="연결중" pulse />
                  : <StatusDot color={vm.isLive ? sem.action.success : sem.text.tertiary} label={vm.statusLabel} />
            )}
          </div>
        </div>
      </div>

      <div css={s.cardBottom}>
        {vm.hasPrice ? (
          <>
            <span css={[s.price, flash && priceFlash[flash]]}>{vm.priceLabel}</span>
            <span css={[s.change[vm.direction], flash && priceFlash[flash]]}>
              {vm.changeLabel}
            </span>
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
  card: (() => {
    const base = `
      position: relative; padding: ${spacing.lg}px;
      min-width: 0; overflow: hidden;
      background: transparent;
      border: 1px solid ${sem.border.muted};
      border-radius: ${radius.lg}px; cursor: pointer;
      transition: background ${transition.fast}, border-color ${transition.fast}, box-shadow ${transition.fast};
      &:hover { background-color: ${sem.action.primarySoft}; box-shadow: ${sem.shadow.default}; }
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
  codeRow: css`display: flex; align-items: center; gap: ${spacing.sm}px; min-width: 0;`,
  codeTxt: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary}; line-height: 1.2; font-variant-numeric: tabular-nums;`,
  cardBottom: css`display: flex; flex-direction: column; align-items: flex-end; gap: ${spacing.xs}px;`,
  price: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    font-variant-numeric: tabular-nums;
  `,
  change: makeDirectionalChange(fontSize.sm),
  dots: css`font-size: ${fontSize.lg}px; color: ${sem.text.tertiary};`,
};
