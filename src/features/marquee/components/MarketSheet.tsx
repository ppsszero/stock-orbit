/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtChangeArrow } from '@/shared/utils/format';
import { MarqueeItem } from '@/shared/types';
import { groupMarqueeItems } from '@/features/marquee/utils/groupMarqueeItems';
import { formatMarqueeValue, formatMarqueeChange } from '@/features/marquee/utils/formatMarqueeValue';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { SheetLayout, Tabs, WebViewPanel } from '@/shared/ui';
import { subTabPadStyle, listRowStyle } from '@/shared/styles/sharedStyles';
import { useToast } from '@/shared/ui/Toast';
import { useWebViewState } from '@/shared/hooks/useWebViewState';
import { InterestRateView } from '@/features/investor/components/InterestRateView';
import { sem } from '@/shared/styles/semantic';

const DOMESTIC_INDICES = new Set(['KOSPI', 'KOSDAQ', 'KPI200', 'KPI100', 'FUT']);

const getMarqueeUrl = (item: MarqueeItem): string | null => {
  if (item.type === 'fx')           return `https://m.stock.naver.com/marketindex/exchange/${item.code}`;
  if (item.type === 'energy')       return `https://m.stock.naver.com/marketindex/energy/${item.code}`;
  if (item.type === 'metals')       return `https://m.stock.naver.com/marketindex/metals/${item.code}`;
  if (item.type === 'agricultural') return `https://m.stock.naver.com/marketindex/agricultural/${item.code}`;
  if (item.type === 'transport')    return `https://m.stock.naver.com/marketindex/transport/${item.code}`;
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

type Category = 'index' | 'fx' | 'bond' | 'commodity';
type CommoditySub = 'energy' | 'metals' | 'agricultural' | 'transport';
type BondSub = 'bond' | 'standard' | 'domestic';

const CATEGORY_LABELS: Record<Category, string> = {
  index:     '주요 지수',
  fx:        '환율',
  bond:      '채권·금리',
  commodity: '원자재',
};

const COMMODITY_SUBS: { key: CommoditySub; label: string }[] = [
  { key: 'energy',       label: '에너지' },
  { key: 'metals',       label: '금속' },
  { key: 'agricultural', label: '농축산물' },
  { key: 'transport',    label: '운송' },
];

const BOND_SUBS: { key: BondSub; label: string }[] = [
  { key: 'bond',     label: '국채수익률' },
  { key: 'standard', label: '기준금리' },
  { key: 'domestic', label: '국내금리' },
];

export const MarketSheet = ({ open, items, onClose }: Props) => {
  const g = useMemo(() => groupMarqueeItems(items), [items]);
  const toast = useToast();

  // 표시 순서: 주요지수 → 환율 → 채권·금리 → 원자재.
  // bond는 별도 API라 항상 표시, commodity는 4종 중 하나라도 있을 때만.
  const availableTabs = useMemo(() => {
    const tabs: { key: Category; label: string }[] = [];
    if (g.index.length > 0) tabs.push({ key: 'index', label: CATEGORY_LABELS.index });
    if (g.fx.length > 0)    tabs.push({ key: 'fx',    label: CATEGORY_LABELS.fx });
    tabs.push({ key: 'bond', label: CATEGORY_LABELS.bond });
    if (g.energy.length > 0 || g.metals.length > 0 || g.agricultural.length > 0 || g.transport.length > 0) {
      tabs.push({ key: 'commodity', label: CATEGORY_LABELS.commodity });
    }
    return tabs;
  }, [g]);

  const [tab, setTab] = useState<Category>('index');
  const [commoditySub, setCommoditySub] = useState<CommoditySub>('energy');
  const [bondSub, setBondSub] = useState<BondSub>('bond');
  const { view, open: openView, close: closeView } = useWebViewState(open);
  const [bondRefreshKey, setBondRefreshKey] = useState(0);
  const wasOpenRef = useRef(false);
  // tab reset에서 최신 availableTabs 참조 — effect deps에 넣지 않고 polling 갱신 시 effect 재실행 회피
  const availRef = useRef(availableTabs);
  availRef.current = availableTabs;

  // open이 false→true로 *전환되는 순간*에만 reset (항상 첫 탭부터)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setTab(availRef.current[0]?.key ?? 'index');
    }
    wasOpenRef.current = open;
  }, [open]);

  // 활성 탭이 사라진 경우 fallback
  const safeTab = availableTabs.find(t => t.key === tab) ? tab : (availableTabs[0]?.key ?? 'index');
  // commodity 서브탭 fallback — 선택된 서브가 비어있으면 데이터 있는 첫 서브로
  const safeCommoditySub: CommoditySub = g[commoditySub].length > 0
    ? commoditySub
    : (COMMODITY_SUBS.find(s => g[s.key].length > 0)?.key ?? 'energy');

  const handleBondLoadResult = useCallback((ok: boolean) => {
    toast.refreshResult(ok, '채권·금리');
  }, [toast]);

  const handleRefresh = useCallback(async () => {
    setBondRefreshKey(k => k + 1);
  }, []);

  if (!open) return null;

  const renderList = (list: MarqueeItem[], subLabel: string) => (
    <div css={s.body}>
      {list.map(i => (
        <div key={i.code}
          css={[listRowStyle, s.row]}
          onClick={() => {
            const u = getMarqueeUrl(i);
            if (u) openView(u, { title: i.name, subtitle: subLabel });
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
  );

  return (
    <SheetLayout open={open} title="시장지표" onClose={onClose}
      onRefresh={safeTab === 'bond' ? handleRefresh : undefined}
      noNavBorder>
      {availableTabs.length > 1 && (
        <Tabs id="market" items={availableTabs} value={safeTab} onChange={setTab} variant="underline" itemAlign="center" />
      )}
      <WebViewPanel url={view?.url ?? null} title={view?.title} subtitle={view?.subtitle}
        onClose={closeView} />

      {safeTab === 'index' && (
        <div role="tabpanel" id="market-panel-index" aria-labelledby="market-tab-index" css={s.panel}>
          {renderList(g.index, CATEGORY_LABELS.index)}
        </div>
      )}

      {safeTab === 'fx' && (
        <div role="tabpanel" id="market-panel-fx" aria-labelledby="market-tab-fx" css={s.panel}>
          {renderList(g.fx, CATEGORY_LABELS.fx)}
        </div>
      )}

      {safeTab === 'bond' && (
        <>
          <div css={subTabPadStyle}>
            <Tabs id="market-bond" items={BOND_SUBS} value={bondSub} onChange={setBondSub} variant="pill" size="sm" />
          </div>
          <div role="tabpanel"
            id="market-panel-bond"
            aria-labelledby={`market-tab-bond market-bond-tab-${bondSub}`}
            css={s.panel}>
            <InterestRateView tab={bondSub} refreshKey={bondRefreshKey} onLoadResult={handleBondLoadResult} />
          </div>
        </>
      )}

      {safeTab === 'commodity' && (
        <>
          <div css={subTabPadStyle}>
            <Tabs id="market-commodity" items={COMMODITY_SUBS} value={safeCommoditySub} onChange={setCommoditySub} variant="pill" size="sm" />
          </div>
          <div role="tabpanel"
            id="market-panel-commodity"
            aria-labelledby={`market-tab-commodity market-commodity-tab-${safeCommoditySub}`}
            css={s.panel}>
            {renderList(g[safeCommoditySub], `${CATEGORY_LABELS.commodity} · ${COMMODITY_SUBS.find(c => c.key === safeCommoditySub)?.label}`)}
          </div>
        </>
      )}
    </SheetLayout>
  );
};

const s = {
  panel: css`flex:1;display:flex;flex-direction:column;min-height:0;overflow-y:auto;`,
  body: css`flex:1;padding:${spacing.sm}px ${spacing.xl}px ${spacing.md}px;`,
  row: css`justify-content: space-between; padding: ${spacing.lg}px ${spacing.md}px;`,
  name: css`font-size:${fontSize.lg}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};`,
  vals: css`display:flex;flex-direction:column;align-items:flex-end;gap:${spacing.xs}px;`,
  val: (d: 'up'|'down'|'flat') => css`
    font-size:${fontSize.xl}px;font-weight:${fontWeight.extrabold};
    color:${d==='up'?sem.feedback.up:d==='down'?sem.feedback.down:sem.text.primary};
    font-variant-numeric:tabular-nums;line-height:1.1;
  `,
  chg: (d: 'up'|'down'|'flat') => css`font-size:${fontSize.sm}px;font-weight:${fontWeight.semibold};color:${d==='up'?sem.feedback.up:d==='down'?sem.feedback.down:sem.feedback.flat};font-variant-numeric:tabular-nums;`,
};
