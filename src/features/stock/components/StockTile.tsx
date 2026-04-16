/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useMemo, memo, useCallback, useRef, useState, useEffect } from 'react';
import { FiTrash2, FiInfo } from 'react-icons/fi';
import { IconButton } from '@/shared/ui';
import { StockSymbol, StockPrice, inferCategory } from '@/shared/types';
import { useStore } from '@/app/store';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { groupHeaderStyle, priceFlash } from '@/shared/styles/sharedStyles';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { fmtNum, fmtPercent, getDisplayName } from '@/shared/utils/format';
import { calcDisplayPrice } from '../utils/currency';
import { useStockGroups, StockGroup } from '../hooks/useStockGroups';
import { EmptyState } from './EmptyState';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/Toast';

interface Props {
  symbols: StockSymbol[];
  prices: Record<string, StockPrice>;
  currencyMode: 'KRW' | 'USD';
  usdkrw: number;
  customGroups?: StockGroup[];
  onRemove?: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
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
  if (dir === 'flat' || abs < 0.01) return sem.bg.surface;
  const scale = dir === 'up' ? HEATMAP_UP : HEATMAP_DOWN;
  if (abs >= 5) return scale[3];
  if (abs >= 3) return scale[2];
  if (abs >= 1) return scale[1];
  return scale[0];
};

/** 이름 텍스트가 ellipsis 상태인지 감지 — 크기 변경 + 텍스트 변경 모두 반응 */
const useIsTruncated = (text: string) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 1프레임 대기 — Emotion CSS 적용 후 측정
    const raf = requestAnimationFrame(() => {
      setTruncated(el.scrollWidth > el.clientWidth);
    });
    const ro = new ResizeObserver(() => {
      setTruncated(el.scrollWidth > el.clientWidth);
    });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [text]);
  return { ref, truncated };
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
  const confirm = useConfirm();
  const toast = useToast();
  const isLarge = span >= 3;
  const sizeKey = isLarge ? 'lg' : 'sm';
  const displayName = p ? getDisplayName(p, sym) : sym.name;
  const display = p ? calcDisplayPrice(p, currencyMode, usdkrw) : null;
  const dir = p?.changeDirection || 'flat';
  const pct = p?.changePercent || 0;
  const { ref: nameRef, truncated } = useIsTruncated(displayName);
  const flash = usePriceFlash(p, dir);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove) return;
    const ok = await confirm({
      title: `"${displayName}" 삭제`,
      message: '이 종목을 관심목록에서 삭제할까요?',
      confirmText: '삭제', cancelText: '취소', danger: true,
    });
    if (ok) {
      type DocWithTransition = Document & { startViewTransition?: (cb: () => void) => void };
      const doc = document as DocWithTransition;
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => onRemove(sym.code));
      } else {
        onRemove(sym.code);
      }
      toast.show(`"${displayName}" 종목을 삭제했어요.`, 'delete');
    }
  }, [onRemove, sym.code, displayName, confirm, toast]);

  const handleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (p) onDetail(sym, p);
  }, [onDetail, sym, p]);

  const tile = (
    <div
      css={s.tile[span]}
      style={{
        background: bg,
        viewTransitionName: `tile-${sym.code.replace(/[^\w]/g, '_')}`,
      }}
      onClick={() => onClick(sym)}
    >
      {/* 호버 시 우하단 액션 버튼 */}
      <div css={s.actions} className="tile-actions">
        {p && (
          <IconButton icon={<FiInfo size={11} />} size={22} onClick={handleDetail} ariaLabel="상세 보기" />
        )}
        {onRemove && (
          <IconButton icon={<FiTrash2 size={11} />} size={22} variant="danger" onClick={handleRemove} ariaLabel="종목 삭제" />
        )}
      </div>

      <span ref={nameRef} css={s.name[sizeKey]}>{displayName}</span>
      {display ? (
        <>
          <span css={[s.pct[sizeKey], flash && priceFlash[flash]]}>{fmtPercent(dir, pct)}</span>
          <span css={[s.price[sizeKey], flash && priceFlash[flash]]}>{display.prefix}{fmtNum(display.price, display.currency)}</span>
        </>
      ) : (
        <span css={s.dots}>···</span>
      )}
    </div>
  );

  return (
    <Tooltip content={truncated ? displayName : ''} position="top" delay={300}>
      {tile}
    </Tooltip>
  );
});

export const StockTile = memo(({ symbols, prices, currencyMode, usdkrw, customGroups, onClick, onRemove, onDetail }: Props) => {
  const sortKey = useStore(s => s.settings.sortKey);
  const sortDir = useStore(s => s.settings.sortDir);
  const { groups } = useStockGroups(symbols, prices, customGroups, { sortKey, sortDir });

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

  return (
    <div css={s.wrap}>
      {tilesPerGroup.map(group => (
        <div key={group.label}>
          <div css={s.groupHeader}>{group.label}</div>
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
  groupHeader: groupHeaderStyle,
  grid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: ${spacing.sm}px; padding: 0 ${spacing.md}px ${spacing.md}px;
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
      &:hover .tile-actions { opacity: 1; }
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
  /** 호버 시 우하단 액션 버튼 */
  actions: css`
    position: absolute; bottom: 4px; right: 4px; z-index: 3;
    display: flex; gap: 3px;
    opacity: 0; transition: opacity ${transition.fast};
  `,
};
