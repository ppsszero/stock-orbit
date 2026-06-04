import { StockPrice } from '@/shared/types';
import { num, parseDir } from './client';
import type { NaverPollingData } from './types';

export type PollingCategory = 'stock' | 'index' | 'futures';

const NATION_CODE_MAP_POLLING: Record<string, string> = {
  KOR: 'KR', USA: 'US', JPN: 'JP', CHN: 'CN', HKG: 'HK', GBR: 'UK', DEU: 'DE', VNM: 'VN',
};

/** 시가총액 raw → 표시용 ("1262조" 식) */
const fmtMarketCapKr = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  if (isNaN(n) || n === 0) return undefined;
  const jo = n / 1e12;
  if (jo >= 1) return `${jo.toFixed(1)}조`;
  const eok = n / 1e8;
  return `${Math.round(eok).toLocaleString()}억`;
};

/**
 * 통합 Polling 파서 — 주식·지수·선물 공용.
 * 주식이고 overMarketPriceInfo가 활성(OPEN)이면 NXT/시간외 가격 우선.
 */
export const parsePollingData = (d: NaverPollingData, code: string, category: PollingCategory): StockPrice => {
  const over = d.overMarketPriceInfo;
  // NXT(시간외/장전) 가격 우선 규칙 — "본장 시간엔 본장가, 그 외엔 NXT":
  //  - KRX 정규장 거래 중(marketStatus==='OPEN')이면 항상 KRX.
  //  - NXT가 OPEN(장전 PRE_MARKET / 장후 AFTER_MARKET)이면 타임스탬프 무관하게 NXT 우선.
  //    (장전엔 KRX가 PREOPEN이라 localTradedAt가 실시간 틱 → NXT 마지막 체결보다 최신처럼 보임.
  //     타임스탬프만 비교하면 장전에 NXT가 무시되는 버그가 있었음. NXT가 OPEN이면 그게 곧 현재 시장.)
  //  - NXT가 닫혔어도(20:00 이후) NXT 마지막 체결이 KRX 종가보다 최신이면 NXT 유지.
  //    (본장 직후 15:30~15:40처럼 NXT 마지막이 더 오래된 경우엔 KRX 종가로 — 오래된 값 튐 방지)
  const hasOver = !!over && !!over.overPrice;
  const overOpen = hasOver && over!.overMarketStatus === 'OPEN';
  const overTime = hasOver && over!.localTradedAt ? Date.parse(over!.localTradedAt) : NaN;
  const krxTime = d.localTradedAt ? Date.parse(d.localTradedAt) : NaN;
  const overNewer = !Number.isNaN(overTime) && (Number.isNaN(krxTime) || overTime >= krxTime);
  const useOver = d.marketStatus !== 'OPEN' && hasOver && (overOpen || overNewer);

  const price = useOver ? num(over!.overPrice!) : num(d.closePriceRaw);
  const changeRaw = useOver
    ? over!.compareToPreviousClosePrice || '0' : d.compareToPreviousClosePriceRaw || '0';
  const change = num(changeRaw);
  const pctRaw = useOver
    ? over!.fluctuationsRatio || '0' : d.fluctuationsRatioRaw || '0';
  const pct = parseFloat(pctRaw) || 0;

  const dirSource = useOver ? over!.compareToPreviousPrice : d.compareToPreviousPrice;
  const dirCode = dirSource?.code;
  let dir = 0;
  if (dirCode === '1' || dirCode === '2') dir = 1;
  else if (dirCode === '4' || dirCode === '5') dir = -1;
  if (dir === 0 && pct !== 0) dir = pct > 0 ? 1 : -1;

  const name = d.futuresName || d.indexName || d.stockName || d.symbolCode || code;

  const nationRaw = d.stockExchangeType?.nationCode || '';
  const nation = NATION_CODE_MAP_POLLING[nationRaw] || nationRaw || '';

  const exchangeRaw = d.stockExchangeType?.nameKor || d.stockExchangeType?.name || '';
  const exchange = exchangeRaw.replace(/ ?증권거래소$/, '');

  const vol = useOver
    ? (over!.accumulatedTradingVolume || d.accumulatedTradingVolume || d.accumulatedTradingVolumeRaw)
    : (d.accumulatedTradingVolume || d.accumulatedTradingVolumeRaw);
  const val = useOver
    ? (over!.accumulatedTradingValue || d.accumulatedTradingValue || d.accumulatedTradingValueRaw)
    : (d.accumulatedTradingValue || d.accumulatedTradingValueRaw);

  const isStock = category === 'stock';

  const marketCap = isStock
    ? (d.marketValueHangeul || fmtMarketCapKr(d.marketValueFullRaw))
    : undefined;
  const marketCapRaw = isStock && d.marketValueFullRaw
    ? Number(d.marketValueFullRaw) : undefined;

  const marketOpen = useOver
    ? over!.overMarketStatus === 'OPEN'
    : d.marketStatus === 'OPEN';

  const openPrice = useOver ? num(over!.openPrice) : num(d.openPriceRaw) || undefined;
  const highPrice = useOver ? num(over!.highPrice) : num(d.highPriceRaw) || undefined;
  const lowPrice = useOver ? num(over!.lowPrice) : num(d.lowPriceRaw) || undefined;

  return {
    code: d.itemCode || d.symbolCode || code,
    name,
    nation,
    market: isStock ? (d.stockExchangeType?.name || exchange)
      : category === 'index' ? '지수' : '선물',
    currentPrice: price,
    previousClose: price - change,
    change: dir >= 0 ? Math.abs(change) : -Math.abs(change),
    changePercent: dir >= 0 ? Math.abs(pct) : -Math.abs(pct),
    changeDirection: parseDir(dir),
    currency: isStock ? (d.currencyType?.code || '') : '',
    marketStatus: marketOpen ? 'OPEN' : 'CLOSE',
    updatedAt: (useOver ? over!.localTradedAt : d.localTradedAt) || new Date().toISOString(),
    reutersCode: d.reutersCode,
    exchange,
    isTradingHalt: isStock
      ? ((useOver ? over!.tradeStopType?.code : d.tradeStopType?.code) ?? '1') !== '1'
      : false,
    openPrice: openPrice || undefined,
    highPrice: highPrice || undefined,
    lowPrice: lowPrice || undefined,
    volume: vol && vol !== '' && vol !== '-' ? vol : undefined,
    tradingValue: val && val !== '' && val !== '-' ? val : undefined,
    marketCap,
    marketCapRaw,
  };
};
