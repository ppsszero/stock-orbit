/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useMemo, memo, useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiTrash2, FiBarChart2, FiExternalLink } from 'react-icons/fi';
import { StockSymbol, StockPrice } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition, zIndex } from '@/shared/styles/tokens';
import { groupHeaderStyle, priceFlash } from '@/shared/styles/sharedStyles';
import { usePriceFlash } from '../hooks/usePriceFlash';
import { fmtNum, fmtPercent, getDisplayName } from '@/shared/utils/format';
import { calcDisplayPrice } from '../utils/currency';
import { useStockGroups, StockGroup } from '../hooks/useStockGroups';
import { EmptyState } from './EmptyState';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/Toast';
import { useBackAction } from '@/shared/hooks/useBackAction';

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
 * span 값이 클수록 그리드에서 더 넓은 영역을 차지함
 *  - ratio >= 0.7 → 4 (2열×2행, large)
 *  - ratio >= 0.5 → 3 (2열×2행, large)
 *  - ratio >= 0.3 → 2 (2열×1행)
 *  - else        → 1 (1열×1행, 최소 보장)
 */
const getSpanByCap = (cap: number, maxCap: number): number => {
  if (maxCap <= 0 || cap <= 0) return 1;
  const ratio = Math.sqrt(cap) / Math.sqrt(maxCap);
  if (ratio >= 0.7) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
};

/** 타일 배경색 — sem.heatmap 또는 sem.bg.elevated만 허용 */
type TileBg = (typeof sem.heatmap)[keyof typeof sem.heatmap] | typeof sem.bg.elevated;

/** 상승 히트맵 색상 — index 0(약) → 3(강) */
const HEATMAP_UP = [sem.heatmap.upWeak, sem.heatmap.upMild, sem.heatmap.upStrong, sem.heatmap.upHeavy];
/** 하락 히트맵 색상 — index 0(약) → 3(강) */
const HEATMAP_DOWN = [sem.heatmap.downWeak, sem.heatmap.downMild, sem.heatmap.downStrong, sem.heatmap.downHeavy];

/** 타일 고유 크기 정책 */
const TILE_SIZE = { sm: '64px', lg: '96px' } as const;

/** 등락 방향 + 등락률 → 타일 배경색 결정 (getSpan과 동일 임계값 사용) */
const getTileColor = (dir: 'up' | 'down' | 'flat', pct: number): TileBg => {
  const abs = Math.abs(pct);
  if (dir === 'flat' || abs < 0.01) return sem.bg.elevated;
  const scale = dir === 'up' ? HEATMAP_UP : HEATMAP_DOWN;
  if (abs >= 5) return scale[3];
  if (abs >= 3) return scale[2];
  if (abs >= 1) return scale[1];
  return scale[0];
};

/** 이름 텍스트가 ellipsis 상태인지 감지하는 훅 */
const useIsTruncated = (text: string) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setTruncated(el.scrollWidth > el.clientWidth);
  }, [text]);
  return { ref, truncated };
};

/** 개별 타일 — memo로 분리하여 리렌더 최소화 */
const Tile = memo(({
  sym, price: p, span, bg, currencyMode, usdkrw,
  open, dimmed, onToggle,
  onRemove, onClick, onDetail,
}: {
  sym: StockSymbol; price: StockPrice | null; span: number; bg: string;
  currencyMode: 'KRW' | 'USD'; usdkrw: number;
  open: boolean; dimmed: boolean; onToggle: () => void;
  onRemove?: (code: string) => void;
  onClick: (symbol: StockSymbol) => void;
  onDetail: (symbol: StockSymbol, price: StockPrice) => void;
}) => {
  const confirm = useConfirm();
  const toast = useToast();
  const wrapRef = useRef<HTMLDivElement>(null);
  const isLarge = span >= 3;
  const sizeKey = isLarge ? 'lg' : 'sm';
  const displayName = p ? getDisplayName(p, sym) : sym.name;
  const display = p ? calcDisplayPrice(p, currencyMode, usdkrw) : null;
  const dir = p?.changeDirection || 'flat';
  const pct = p?.changePercent || 0;
  const { ref: nameRef } = useIsTruncated(displayName);
  const flash = usePriceFlash(p, dir);

  const closePopover = useCallback(() => { if (open) onToggle(); }, [open, onToggle]);
  useBackAction(open, closePopover);

  // 바깥 클릭 감지 — portal 팝오버도 "내부"로 인식해야 하므로 직접 구현
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      onToggle();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onToggle]);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
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
  }, [onRemove, onToggle, sym.code, displayName, confirm, toast]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
    onClick(sym);
  }, [onClick, onToggle, sym]);

  const handleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
    if (p) onDetail(sym, p);
  }, [onDetail, onToggle, sym, p]);

  const handleTileClick = useCallback(() => onToggle(), [onToggle]);

  // portal 팝오버 위치 계산 — 상하 배치, 화면 밖 넘침 보정
  const tileRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open || !tileRef.current || !popRef.current) return;
    const tile = tileRef.current.getBoundingClientRect();
    const pop = popRef.current;
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;
    const pad = 6;
    const gap = 6;

    // 가로: 타일 중앙 정렬, 화면 밖 클램프
    let x = tile.left + tile.width / 2 - popW / 2;
    x = Math.max(pad, Math.min(x, window.innerWidth - popW - pad));

    // 세로: 타일 아래 우선, 공간 부족 시 위로
    let y = tile.bottom + gap;
    if (y + popH > window.innerHeight - pad) {
      y = tile.top - popH - gap;
    }
    y = Math.max(pad, y);

    setPopStyle({ left: x, top: y });
  }, [open]);

  return (
    <div ref={wrapRef} css={s.tileWrap[span]}>
      <div
        ref={tileRef}
        css={[s.tile[span], dimmed && s.tileDimmed]}
        style={{
          background: bg,
          viewTransitionName: `tile-${sym.code.replace(/[^\w]/g, '_')}`,
        }}
        onClick={handleTileClick}
      >
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

      {/* portal — body에 렌더하여 overflow 잘림 방지 */}
      {open && ReactDOM.createPortal(
        <div ref={popRef} css={s.popover} style={popStyle} onMouseDown={e => e.stopPropagation()}>
          <span css={s.popName}>{displayName}</span>
          <div css={s.popActions}>
            <button css={s.popBtn} onClick={handleClick} aria-label="외부 링크 열기">
              <FiExternalLink size={13} />
            </button>
            {p && (
              <button css={s.popBtn} onClick={handleDetail} aria-label="상세 보기">
                <FiBarChart2 size={13} />
              </button>
            )}
            {onRemove && (
              <button css={s.popBtnDanger} onClick={handleRemove} aria-label="종목 삭제">
                <FiTrash2 size={13} />
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export const StockTile = memo(({ symbols, prices, currencyMode, usdkrw, customGroups, onClick, onRemove, onDetail }: Props) => {
  const { groups } = useStockGroups(symbols, prices, customGroups);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const handleToggle = useCallback((code: string) => {
    setActiveCode(c => c === code ? null : code);
  }, []);

  const tilesPerGroup = useMemo(() => {
    return groups.map(g => {
      const items = g.items.map(sym => ({ sym, price: prices[sym.code] || null }));
      const caps = items.map(t => t.price?.marketCapRaw || 0);
      const maxCap = Math.max(...caps, 0);
      return {
        label: g.label,
        maxCap,
        tiles: items.sort((a, b) => (b.price?.marketCapRaw || 0) - (a.price?.marketCapRaw || 0)),
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
              const isOpen = activeCode === sym.code;
              const isDimmed = activeCode !== null && !isOpen;
              return (
                <Tile
                  key={sym.code}
                  sym={sym} price={p} span={span} bg={bg}
                  currencyMode={currencyMode} usdkrw={usdkrw}
                  open={isOpen} dimmed={isDimmed}
                  onToggle={() => handleToggle(sym.code)}
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
  /** 4열 그리드 — 타일이 span에 따라 1~2열, 1~2행을 차지 */
  grid: css`
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: ${spacing.sm}px; padding: 0 ${spacing.md}px ${spacing.md}px;
  `,
  /** 타일 + 팝오버를 감싸는 position 컨텍스트 — grid span 상속 */
  tileWrap: {
    1: css`position: relative; grid-column: span 1; grid-row: span 1;`,
    2: css`position: relative; grid-column: span 2; grid-row: span 1;`,
    3: css`position: relative; grid-column: span 2; grid-row: span 2;`,
    4: css`position: relative; grid-column: span 2; grid-row: span 2;`,
  } as Record<number, ReturnType<typeof css>>,
  /** span별 타일 레이아웃 — bg는 인라인 style로 분리하여 css() 호출 최소화 */
  tile: (() => {
    const base = `
      border-radius: ${radius.lg}px; padding: ${spacing.lg}px;
      min-width: 0; overflow: hidden; height: 100%;
      cursor: pointer; display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      transition: filter ${transition.fast}, outline ${transition.fast};
      &:hover { filter: brightness(1.15); }
    `;
    return {
      1: css`${base} gap: ${spacing.xs}px; min-height: ${TILE_SIZE.sm};`,
      2: css`${base} gap: ${spacing.xs}px; min-height: ${TILE_SIZE.sm};`,
      3: css`${base} gap: ${spacing.sm}px; min-height: ${TILE_SIZE.lg};`,
      4: css`${base} gap: ${spacing.sm}px; min-height: ${TILE_SIZE.lg};`,
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
  /** 선택된 타일 하이라이트 */
  /** 다른 타일이 선택됐을 때 흑백 + 어둡게 */
  tileDimmed: css`
    filter: grayscale(1) brightness(0.6);
    transition: filter 0.2s ease;
  `,
  /** 타일 하단 팝오버 (portal → body) */
  popover: css`
    position: fixed;
    background: ${sem.surface.popover}; border-radius: ${radius.xl}px;
    padding: ${spacing.md}px ${spacing.lg}px;
    box-shadow: ${sem.shadow.popover};
    z-index: ${zIndex.dropdown};
    display: flex; flex-direction: column; align-items: center; gap: ${spacing.sm}px;
    white-space: nowrap;
  `,
  popName: css`
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold};
    color: ${sem.surface.popoverText}; max-width: 200px;
    overflow: hidden; text-overflow: ellipsis;
    padding: ${spacing.sm}px 0;
  `,
  popActions: css`display: flex; align-items: center; gap: ${spacing.sm}px;`,
  popBtn: css`
    width: 28px; height: 28px; padding: 0;
    border: none; border-radius: ${radius.md}px;
    background: transparent; color: ${sem.surface.popoverText};
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background ${transition.fast};
    &:hover { background: ${sem.action.primaryHover}; color: ${sem.action.primary}; }
  `,
  popBtnDanger: css`
    width: 28px; height: 28px; padding: 0;
    border: none; border-radius: ${radius.md}px;
    background: transparent; color: ${sem.surface.popoverText};
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background ${transition.fast};
    &:hover { background: ${sem.action.dangerTint}; color: ${sem.action.danger}; }
  `,
};
