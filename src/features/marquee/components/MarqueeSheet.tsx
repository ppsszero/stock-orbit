/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtChangeArrow } from '@/shared/utils/format';
import { MarqueeItem } from '@/shared/types';
import { groupMarqueeItems } from '@/features/marquee/utils/groupMarqueeItems';
import { formatMarqueeValue, formatMarqueeChange } from '@/features/marquee/utils/formatMarqueeValue';
import { spacing, fontSize, fontWeight, radius } from '@/shared/styles/tokens';
import { SheetLayout, Tabs, WebViewPanel } from '@/shared/ui';
import { sem } from '@/shared/styles/semantic';

const DOMESTIC_INDICES = new Set(['KOSPI', 'KOSDAQ', 'KPI200', 'KPI100', 'FUT']);

const getMarqueeUrl = (item: MarqueeItem): string | null => {
  if (item.type === 'fx')     return `https://m.stock.naver.com/marketindex/exchange/${item.code}`;
  if (item.type === 'energy') return `https://m.stock.naver.com/marketindex/energy/${item.code}`;
  if (item.type === 'metals') return `https://m.stock.naver.com/marketindex/metals/${item.code}`;
  if (item.type === 'index') {
    return DOMESTIC_INDICES.has(item.code)
      ? `https://m.stock.naver.com/domestic/index/${item.code}`
      : `https://m.stock.naver.com/worldstock/index/${item.code}`;
  }
  return null;
};

interface Props {
  open: boolean; items: MarqueeItem[];
  onClose: () => void;
}

type Category = 'index' | 'fx' | 'energy' | 'metals';

const CATEGORY_LABELS: Record<Category, string> = {
  index: '주요 지수',
  fx: '환율',
  energy: '에너지',
  metals: '금속',
};

const CATEGORY_ORDER: Category[] = ['index', 'fx', 'energy', 'metals'];

export const MarqueeSheet = ({ open, items, onClose }: Props) => {
  const g = useMemo(() => groupMarqueeItems(items), [items]);

  // 비어있지 않은 카테고리만 탭 노출
  const availableTabs = useMemo(
    () => CATEGORY_ORDER.filter(k => g[k].length > 0).map(k => ({ key: k, label: CATEGORY_LABELS[k] })),
    [g]
  );

  const [tab, setTab] = useState<Category>('index');
  const [view, setView] = useState<{ url: string; title: string; sub: string } | null>(null);
  const wasOpenRef = useRef(false);
  // tab reset에서 최신 g/availableTabs 참조 — effect deps에 넣지 않고 polling 갱신 시 effect 재실행 회피
  const gRef = useRef(g);
  const availRef = useRef(availableTabs);
  gRef.current = g;
  availRef.current = availableTabs;

  // open이 false→true로 *전환되는 순간*에만 reset
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTab(gRef.current.index.length > 0 ? 'index' : (availRef.current[0]?.key ?? 'index'));
    }
    wasOpenRef.current = open;
  }, [open]);

  if (!open) return null;
  // 활성 탭이 사라진 경우 fallback (예: 카테고리 비어버림)
  const safeTab = availableTabs.find(t => t.key === tab) ? tab : (availableTabs[0]?.key ?? 'index');
  const activeItems = g[safeTab] || [];

  return (
    <SheetLayout open={open} title="시장지표" onClose={onClose} noNavBorder>
      {availableTabs.length > 1 && (
        <Tabs id="marquee" items={availableTabs} value={safeTab} onChange={setTab} variant="underline" itemAlign="center" />
      )}
      <WebViewPanel url={view?.url ?? null} title={view?.title} subtitle={view?.sub}
        onClose={() => setView(null)} />
      <div role="tabpanel"
        id={`marquee-panel-${safeTab}`}
        aria-labelledby={availableTabs.length > 1 ? `marquee-tab-${safeTab}` : undefined}
        css={s.body}>
        {activeItems.map(i => (
          <div key={i.code}
            css={s.row}
            onClick={() => {
              const u = getMarqueeUrl(i);
              // sub는 현재 활성 탭 라벨 (i.type 직접 매핑 회피 — type union에 commodity 등 매핑 누락 안전)
              if (u) setView({ url: u, title: i.name, sub: CATEGORY_LABELS[safeTab] });
            }}>
            <span css={s.name}>{i.name}</span>
            <div css={s.vals}>
              <span css={s.val(i.changeDirection)}>{formatMarqueeValue(i)}</span>
              <span css={s.chg(i.changeDirection)}>
                {fmtChangeArrow(i.changeDirection, i.changePercent, formatMarqueeChange(i))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SheetLayout>
  );
};

const s = {
  body: css`flex:1;overflow-y:auto;padding:${spacing.sm}px ${spacing.xl}px ${spacing.md}px;`,
  row: css`
    display:flex;align-items:center;justify-content:space-between;
    padding:${spacing.lg}px ${spacing.md}px;
    border-radius:${radius.lg}px;
    cursor: pointer;
    &:not(:last-of-type) { border-bottom: 1px dotted ${sem.border.muted}; }
    &:hover{background:${sem.action.primarySoft};}
  `,
  name: css`font-size:${fontSize.lg}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};`,
  vals: css`display:flex;flex-direction:column;align-items:flex-end;gap:${spacing.xs}px;`,
  val: (d: 'up'|'down'|'flat') => css`
    font-size:${fontSize.xl}px;font-weight:${fontWeight.extrabold};
    color:${d==='up'?sem.feedback.up:d==='down'?sem.feedback.down:sem.text.primary};
    font-variant-numeric:tabular-nums;line-height:1.1;
  `,
  chg: (d: 'up'|'down'|'flat') => css`font-size:${fontSize.sm}px;font-weight:${fontWeight.semibold};color:${d==='up'?sem.feedback.up:d==='down'?sem.feedback.down:sem.feedback.flat};font-variant-numeric:tabular-nums;`,
};
