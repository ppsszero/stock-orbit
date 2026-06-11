/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, memo } from 'react';
import { FiInfo, FiTrash2 } from 'react-icons/fi';
import { useStore } from '@/app/store';
import { StockSymbol, StockPrice, inferCategory } from '@/shared/types';
import { spacing, fontSize, fontWeight, sp } from '@/shared/styles/tokens';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { useSymbolRemove } from '../hooks/useSymbolRemove';
import { useIsTruncated } from '@/shared/hooks/useIsTruncated';
import { Badge, StatusDot, StockLogo, Menu, ReorderIcon, Tooltip } from '@/shared/ui';
import { EditSymbolsSheet } from '@/features/preset';
import { CATEGORY_BADGE } from '@/shared/utils/format';
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

export const StockRow = memo(({
  sym, price: p, currencyMode, usdkrw,
  onRemove, onClick, onDetail, daymarketConnecting = false,
}: Props) => {
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

  const handleRowClick = useCallback(() => {
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
  // 안정 참조 — inline 함수면 매 렌더마다 새 ref가 되어 useBackAction 스택이 reshuffle됨
  const closeEdit = useCallback(() => setEditOpen(false), []);

  // 우클릭 메뉴 "삭제" — confirm dialog + toast 자동 처리
  const handleRemove = useSymbolRemove(sym, vm.displayName, onRemove);

  // 이름 ellipsis 시에만 Tooltip 표시
  const { ref: nameRef, truncated } = useIsTruncated(vm.displayName);

  // 편집 시트는 우클릭한 종목이 실제로 속한 그룹을 편집.
  // 전체 탭에서 우클릭하면 activeId가 '__all__'이라 그룹 매칭이 안 돼 첫 그룹으로 가는 버그 방지.
  const editPreset = presets.find(p => p.symbols.some(s => s.code === sym.code))
    ?? presets.find(p => p.id === activeId)
    ?? presets[0];

  return (
    <div
      role="listitem"
      css={s.row}
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
    >
      <div css={s.logoWrap}>
        <StockLogo
          src={vm.logoUrl}
          fallbackChar={vm.displayName.charAt(0)}
          fallbackBg={vm.badge.bg} fallbackFg={vm.badge.fg}
          size={spacing['4xl']}
        />
      </div>

      <div css={s.left}>
        <div css={s.nameRow}>
          <Tooltip content={truncated ? vm.displayName : ''} position="top" delay={300}>
            <span ref={nameRef} css={s.name}>{vm.displayName}</span>
          </Tooltip>
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
              : isDmLoading
                ? <StatusDot color={sem.text.secondary} label="연결중" pulse />
                : <StatusDot color={vm.isLive ? sem.action.success : sem.text.tertiary} label={vm.statusLabel} />
          )}
        </div>
      </div>

      <div css={s.right}>
        {vm.hasPrice ? (
          <>
            <span css={[s.price, flash && priceFlash[flash]]}>{vm.priceLabel}</span>
            <span css={[s.change[vm.direction], flash && priceFlash[flash]]}>{vm.changeLabel}</span>
          </>
        ) : (
          <span css={s.dots}>···</span>
        )}
      </div>

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
    </div>
  );
});

/* --- Styles --- */

const s = {
  row: css`
    display: flex; align-items: center; justify-content: space-between;
    padding: ${sp('sm', 'xs')} ${spacing.xl}px;
    cursor: pointer;
    background: ${sem.bg.base};
    &:hover { background: ${sem.action.primarySoft}; }
  `,
  logoWrap: css`
    width: ${spacing['4xl']}px; height: ${spacing['4xl']}px; flex-shrink: 0; margin-right: ${sp('md', 'xs')};
  `,
  /* gap sm — 뱃지 높이 14px 축소와 세트로 행 높이 29px 유지하며 줄 사이 공기 확보 */
  left: css`display: flex; flex-direction: column; gap: ${spacing.sm}px; min-width: 0; flex: 1;`,
  nameRow: css`display: flex; align-items: center; gap: ${spacing.sm + spacing.xs}px;`,
  badges: css`display: flex; align-items: center; gap: ${spacing.xs}px;`,
  name: css`
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  sub: css`display: flex; align-items: center; gap: ${spacing.md}px;`,
  code: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; font-variant-numeric: tabular-nums; line-height: 1.1;`,
  right: css`display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: ${spacing.xs}px; flex-shrink: 0; min-width: 100px; min-height: 38px;`,
  price: css`font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  change: makeDirectionalChange(fontSize.sm),
  dots: css`font-size: ${fontSize.lg}px; color: ${sem.text.tertiary};`,
};
