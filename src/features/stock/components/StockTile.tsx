/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useMemo, memo, useCallback, useState } from 'react';
import { FiInfo, FiTrash2 } from 'react-icons/fi';
import { LoadingCenter, Menu, ListHeader, ReorderIcon } from '@/shared/ui';
import { useStore } from '@/app/store';
import { EditSymbolsSheet } from '@/features/preset';
import { StockSymbol, StockPrice, inferCategory } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { priceFlash } from '@/shared/styles/sharedStyles';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { useSymbolRemove } from '../hooks/useSymbolRemove';
import { fmtPercent } from '@/shared/utils/format';
import { useStockViewModel } from '../hooks/useStockViewModel';
import { useStockGroups, StockGroup } from '../hooks/useStockGroups';
import { EmptyState } from './EmptyState';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useIsTruncated } from '@/shared/hooks/useIsTruncated';

interface Props {
  symbols: StockSymbol[];
  prices: Record<string, StockPrice>;
  currencyMode: 'KRW' | 'USD';
  usdkrw: number;
  customGroups?: StockGroup[];
  onRemove?: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
  /** 타일뷰(히트맵)는 미사용 — commonProps 스프레드 수용용. 연결 안내는 리스트/그리드 StatusDot 펄스로. */
  daymarketConnecting?: boolean;
}

/**
 * 시가총액(sqrt 압축) → 타일 크기(span) 매핑
 * 그룹 내 최대 시총 대비 비율로 판정. sqrt로 분포 압축하여 극단치 완화.
 */
const getSpanByCap = (cap: number, maxCap: number): number => {
  if (maxCap <= 0 || cap <= 0) return 1;
  const ratio = Math.sqrt(cap) / Math.sqrt(maxCap);
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
};

type TileBg = (typeof sem.heatmap)[keyof typeof sem.heatmap] | typeof sem.bg.elevated | typeof sem.bg.surface;

const HEATMAP_UP = [sem.heatmap.upWeak, sem.heatmap.upMild, sem.heatmap.upStrong, sem.heatmap.upHeavy];
const HEATMAP_DOWN = [sem.heatmap.downWeak, sem.heatmap.downMild, sem.heatmap.downStrong, sem.heatmap.downHeavy];

const TILE_SIZE = { sm: '64px', lg: '96px' } as const;

const getTileColor = (dir: 'up' | 'down' | 'flat', pct: number): TileBg => {
  const abs = Math.abs(pct);
  // flat: 카드 배경에 묻히는 회색 대신 elevated 중립 패널 사용. 텍스트는 어둡게 오버라이드(아래)
  if (dir === 'flat' || abs < 0.01) return sem.bg.elevated;
  const scale = dir === 'up' ? HEATMAP_UP : HEATMAP_DOWN;
  if (abs >= 5) return scale[3];
  if (abs >= 3) return scale[2];
  if (abs >= 1) return scale[1];
  return scale[0];
};

/** 개별 타일 — 클릭 → 웹뷰, 호버 → 상세/삭제 버튼 */
const Tile = memo(({
  sym, price: p, span, bg, currencyMode, usdkrw,
  onRemove, onClick, onDetail,
}: {
  sym: StockSymbol; price: StockPrice | null; span: number; bg: string;
  currencyMode: 'KRW' | 'USD'; usdkrw: number;
  onRemove?: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
}) => {
  const isLarge = span >= 3;
  const sizeKey = isLarge ? 'lg' : 'sm';
  const vm = useStockViewModel(sym, p ?? undefined, currencyMode, usdkrw);
  const pct = p?.changePercent || 0;
  const isFlat = vm.direction === 'flat' || Math.abs(pct) < 0.01;
  const { ref: nameRef, truncated } = useIsTruncated(vm.displayName);
  const flash = usePriceFlash(p, vm.direction);

  const [ctxPos, setCtxPos] = useState<{ x: number; y: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const presets = useStore(s => s.presets);
  const activeId = useStore(s => s.activeId);

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

  // 우클릭 메뉴 "삭제" — confirm dialog + toast + ViewTransition 자동 처리
  const handleRemove = useSymbolRemove(sym, vm.displayName, onRemove, { withTransition: true });

  // 우클릭한 타일의 종목이 실제로 속한 그룹 우선 (전체 탭에서 activeId='__all__' 매칭 실패 사고 방지)
  const editPreset = presets.find(p => p.symbols.some(s => s.code === sym.code))
    ?? presets.find(p => p.id === activeId)
    ?? presets[0];

  // 툴팁 — 종목명 + 등락 (리스트뷰와 동일 포맷, vm.changeLabel 재사용). 등락 라인은 방향별 컬러.
  // 줄 간격은 증시현황(SectorTreemap) 툴팁과 동일하게 spacing.sm 적용.
  const tooltipContent: React.ReactNode = vm.hasPrice
    ? (
      <>
        <div css={s.tipTitle}>{vm.displayName}</div>
        <div css={s.tipChange[vm.direction]}>{vm.changeLabel}</div>
      </>
    )
    : (truncated ? vm.displayName : '');

  const tile = (
    <div
      css={s.tile[span]}
      style={{
        background: bg,
        viewTransitionName: `tile-${sym.nation}-${sym.code.replace(/[^\w]/g, '_')}`,
      }}
      onClick={() => onClick(sym)}
      onContextMenu={handleContextMenu}
    >
      <span ref={nameRef} css={[s.name[sizeKey], isFlat && s.flatHeadingText]}>{vm.displayName}</span>
      {vm.hasPrice ? (
        <>
          <span css={[s.pct[sizeKey], isFlat && s.flatHeadingText, flash && priceFlash[flash]]}>{fmtPercent(vm.direction, pct)}</span>
          <span css={[s.price[sizeKey], isFlat && s.flatPriceText, flash && priceFlash[flash]]}>{vm.priceLabel}</span>
        </>
      ) : (
        <span css={s.dots}>···</span>
      )}
    </div>
  );

  return (
    <>
      <Tooltip content={tooltipContent} position="top" delay={300}>
        {tile}
      </Tooltip>
      <Menu open={!!ctxPos}
        anchorPoint={ctxPos ?? { x: 0, y: 0 }}
        onClose={closeCtx}>
        {p && (
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
    </>
  );
});

export const StockTile = memo(({ symbols, prices, currencyMode, usdkrw, customGroups, onClick, onRemove, onDetail }: Props) => {
  // 타일뷰는 시총 크기 기반 배치이므로 드롭다운 정렬을 따르지 않음
  const { groups } = useStockGroups(symbols, prices, customGroups, { sortByMarketOpen: true });

  const tilesPerGroup = useMemo(() => {
    return groups.map(g => {
      const items = g.items.map(sym => ({ sym, price: prices[sym.code] || null }));
      // 지수/선물 그룹은 시총 개념이 없으므로 maxCap=0 → 전부 span=1 동일 크기
      const isIndexFutures = g.items.every(s => {
        const cat = inferCategory(s);
        return cat === 'index' || cat === 'futures';
      });
      const caps = isIndexFutures ? [] : items.map(t => t.price?.marketCapRaw || 0);
      const maxCap = Math.max(...caps, 0);
      return {
        label: g.label,
        maxCap,
        tiles: isIndexFutures
          ? items
          : items.sort((a, b) => (b.price?.marketCapRaw || 0) - (a.price?.marketCapRaw || 0)),
      };
    });
  }, [groups, prices]);

  if (symbols.length === 0) return <EmptyState />;
  // 강력 새로고침 직후엔 prices가 비어 모든 타일이 1x1 회색으로 깔림.
  // 시총 기반 layout 계산이 완료될 때까지 로더로 가림.
  if (Object.keys(prices).length === 0) return <LoadingCenter fill label="데이터를 불러오는 중..." />;

  return (
    <div css={s.wrap}>
      {tilesPerGroup.map(group => (
        <div key={group.label}>
          <ListHeader sticky caps title={<ListHeader.Title size="sm" color={sem.text.tertiary}>{group.label}</ListHeader.Title>} />
          <div css={s.grid}>
            {group.tiles.map(({ sym, price: p }) => {
              const cap = p?.marketCapRaw || 0;
              const dir = p?.changeDirection || 'flat';
              const pct = p?.changePercent || 0;
              const span = getSpanByCap(cap, group.maxCap);
              const bg = getTileColor(dir, pct);
              return (
                <Tile
                  key={sym.code}
                  sym={sym} price={p} span={span} bg={bg}
                  currencyMode={currencyMode} usdkrw={usdkrw}
                  onRemove={onRemove} onClick={onClick} onDetail={onDetail}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

// ── Styles ──────────────────────────────────────────
const s = {
  wrap: css`flex: 1; overflow-y: auto; overflow-x: hidden;`,
  grid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: ${spacing.sm}px; padding: 0 ${spacing.xl}px ${spacing.md}px;
  `,
  tile: (() => {
    const base = `
      position: relative;
      border-radius: ${radius.lg}px; padding: ${spacing.lg}px;
      min-width: 0; overflow: hidden;
      cursor: pointer; display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      transition: filter ${transition.fast};
      &:hover { filter: brightness(1.15); }
    `;
    return {
      1: css`${base} grid-column: span 1; grid-row: span 1; gap: ${spacing.xs}px; min-height: ${TILE_SIZE.sm};`,
      2: css`${base} grid-column: span 2; grid-row: span 1; gap: ${spacing.xs}px; min-height: ${TILE_SIZE.sm};`,
      3: css`${base} grid-column: span 2; grid-row: span 2; gap: ${spacing.sm}px; min-height: ${TILE_SIZE.lg};`,
      4: css`${base} grid-column: span 2; grid-row: span 2; gap: ${spacing.sm}px; min-height: ${TILE_SIZE.lg};`,
    };
  })() as Record<number, ReturnType<typeof css>>,
  name: {
    sm: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; color: ${sem.heatmap.text}; text-shadow: ${sem.heatmap.shadowSm}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; text-align: center;`,
    lg: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold}; color: ${sem.heatmap.text}; text-shadow: ${sem.heatmap.shadowSm}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; text-align: center;`,
  },
  pct: {
    sm: css`font-size: ${fontSize.md}px; font-weight: ${fontWeight.extrabold}; color: ${sem.heatmap.text}; text-shadow: ${sem.heatmap.shadowMd}; font-variant-numeric: tabular-nums; line-height: 1.2;`,
    lg: css`font-size: ${fontSize['2xl']}px; font-weight: ${fontWeight.extrabold}; color: ${sem.heatmap.text}; text-shadow: ${sem.heatmap.shadowMd}; font-variant-numeric: tabular-nums; line-height: 1.2;`,
  },
  price: {
    sm: css`font-size: ${fontSize.xs}px; font-weight: ${fontWeight.medium}; color: ${sem.heatmap.textMuted}; font-variant-numeric: tabular-nums;`,
    lg: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium}; color: ${sem.heatmap.textMuted}; font-variant-numeric: tabular-nums;`,
  },
  dots: css`font-size: ${fontSize.md}px; color: ${sem.heatmap.textFaint};`,
  // flat 타일 전용 텍스트 — bg.elevated 위에서 가독성 확보 (라이트: 다크 텍스트, 다크: 라이트 텍스트)
  flatHeadingText: css`color: ${sem.text.primary}; text-shadow: none;`,
  flatPriceText: css`color: ${sem.text.secondary}; text-shadow: none;`,
  // 툴팁 종목명 라인 — SectorTreemap.tipTitle과 동일한 줄 간격(spacing.sm)
  tipTitle: css`margin-bottom: ${spacing.sm}px;`,
  // 툴팁 내 등락 라인 컬러 — 리스트/그리드의 등락 텍스트와 동일한 sem.feedback 토큰 (makeDirectionalChange와 일치)
  tipChange: {
    up:   css`color: ${sem.feedback.up};   font-variant-numeric: tabular-nums;`,
    down: css`color: ${sem.feedback.down}; font-variant-numeric: tabular-nums;`,
    flat: css`color: ${sem.feedback.flat}; font-variant-numeric: tabular-nums;`,
  } as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>,
};
