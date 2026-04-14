/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useMemo, memo, useCallback } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { StockSymbol, StockPrice } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition , shadow } from '@/shared/styles/tokens';
import { groupHeaderStyle } from '@/shared/styles/sharedStyles';
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

export const StockTile = memo(({ symbols, prices, currencyMode, usdkrw, customGroups, onClick, onRemove }: Props) => {
  const { groups } = useStockGroups(symbols, prices, customGroups);
  const confirm = useConfirm();
  const toast = useToast();

  const handleRemove = useCallback(async (sym: StockSymbol, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove) return;
    const displayName = sym.name;
    const ok = await confirm({
      title: `"${displayName}" 삭제`,
      message: '이 종목을 관심목록에서 삭제할까요?',
      confirmText: '삭제', cancelText: '취소', danger: true,
    });
    if (ok) {
      // View Transitions API — 타일 삭제 + 리셔플을 부드럽게 애니메이션
      // Chromium 111+ 지원. 미지원 환경(구버전/기타)은 즉시 반영.
      type DocWithTransition = Document & { startViewTransition?: (cb: () => void) => void };
      const doc = document as DocWithTransition;
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => onRemove(sym.code));
      } else {
        onRemove(sym.code);
      }
      toast.show(`"${displayName}" 종목을 삭제했어요.`, 'delete');
    }
  }, [onRemove, confirm, toast]);

  // 그룹별 타일 데이터 — 시가총액 내림차순 정렬 (큰 회사가 앞에)
  // maxCap은 그룹 내 상대 비율 계산용
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
              const dir = p?.changeDirection || 'flat';
              const pct = p?.changePercent || 0;
              const cap = p?.marketCapRaw || 0;
              const span = getSpanByCap(cap, group.maxCap);
              const bg = getTileColor(dir, pct);
              const display = p ? calcDisplayPrice(p, currencyMode, usdkrw) : null;
              const isLarge = span >= 3; // 3% 이상 → 큰 타일 (2열×2행, 큰 폰트)

              const sizeKey = isLarge ? 'lg' : 'sm';
              const displayName = p ? getDisplayName(p, sym) : sym.name;
              return (
                <Tooltip key={sym.code} content={displayName} position="top" delay={300}>
                  <div
                    css={s.tile[span]}
                    style={{
                      background: bg,
                      // View Transitions API 용 — 타일별 고유 이름 (특수문자 제거)
                      viewTransitionName: `tile-${sym.code.replace(/[^\w]/g, '_')}`,
                    }}
                    onClick={() => onClick(sym)}
                  >
                    {onRemove && (
                      <button
                        css={s.delBtn}
                        className="tile-del"
                        onClick={(e) => handleRemove(sym, e)}
                        aria-label="종목 삭제"
                      >
                        <FiTrash2 size={10} />
                      </button>
                    )}
                    <span css={s.name[sizeKey]}>{displayName}</span>
                    {display ? (
                      <>
                        <span css={s.pct[sizeKey]}>
                          {fmtPercent(dir, pct)}
                        </span>
                        <span css={s.price[sizeKey]}>
                          {display.prefix}{fmtNum(display.price, display.currency)}
                        </span>
                      </>
                    ) : (
                      <span css={s.dots}>···</span>
                    )}
                  </div>
                </Tooltip>
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
  /** span별 타일 레이아웃 — bg는 인라인 style로 분리하여 css() 호출 최소화 */
  tile: (() => {
    const base = `
      position: relative;
      border-radius: ${radius.lg}px; padding: ${spacing.lg}px;
      min-width: 0; overflow: hidden;
      cursor: pointer; display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      transition: filter ${transition.fast};
      &:hover { filter: brightness(1.15); }
      &:hover .tile-del { opacity: 1; }
    `;
    return {
      1: css`${base} grid-column: span 1; grid-row: span 1; gap: ${spacing.xs}px; min-height: ${TILE_SIZE.sm};`,
      2: css`${base} grid-column: span 2; grid-row: span 1; gap: ${spacing.xs}px; min-height: ${TILE_SIZE.sm};`,
      3: css`${base} grid-column: span 2; grid-row: span 2; gap: ${spacing.sm}px; min-height: ${TILE_SIZE.lg};`,
      4: css`${base} grid-column: span 2; grid-row: span 2; gap: ${spacing.sm}px; min-height: ${TILE_SIZE.lg};`,
    };
  })() as Record<number, ReturnType<typeof css>>,
  name: {
    sm: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; color: ${sem.heatmap.text}; text-shadow: ${shadow.textSm}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; text-align: center;`,
    lg: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold}; color: ${sem.heatmap.text}; text-shadow: ${shadow.textSm}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; text-align: center;`,
  },
  pct: {
    sm: css`font-size: ${fontSize.md}px; font-weight: ${fontWeight.extrabold}; color: ${sem.heatmap.text}; text-shadow: ${shadow.textMd}; font-variant-numeric: tabular-nums; line-height: 1.2;`,
    lg: css`font-size: ${fontSize['2xl']}px; font-weight: ${fontWeight.extrabold}; color: ${sem.heatmap.text}; text-shadow: ${shadow.textMd}; font-variant-numeric: tabular-nums; line-height: 1.2;`,
  },
  price: {
    sm: css`font-size: ${fontSize.xs}px; font-weight: ${fontWeight.medium}; color: ${sem.heatmap.textMuted}; font-variant-numeric: tabular-nums;`,
    lg: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium}; color: ${sem.heatmap.textMuted}; font-variant-numeric: tabular-nums;`,
  },
  dots: css`font-size: ${fontSize.md}px; color: ${sem.heatmap.textFaint};`,
  delBtn: css`
    position: absolute; top: 4px; right: 4px; z-index: 3;
    width: 20px; height: 20px; padding: 0;
    border: none; border-radius: ${radius.md}px;
    background: ${sem.action.dangerTint}; color: ${sem.action.danger};
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity ${transition.fast}, background ${transition.fast};
    &:hover { background: ${sem.action.dangerBorder}; }
  `,
};
