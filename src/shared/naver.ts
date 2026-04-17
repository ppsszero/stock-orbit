import { NaverAutoCompleteResponse, NaverAutoCompleteItem, StockPrice, StockSymbol, MarqueeItem, inferCategory } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import type {
  NaverIndexPollingRaw,
  NaverCommodityItemRaw,
  NaverCommodityPollingRaw,
  NaverFXRaw,
  NaverDomesticRankingRaw,
  NaverForeignRankingRaw,
  NaverForeignRankingItemRaw,
  NaverPriceDirection,
  NaverInvestorDataRaw,
  NaverMarketBriefingRaw,
  NaverNewsListRaw,
  NaverMoneyStoryRaw,
  NaverEconomicCalendarRaw,
  NaverEconomicIndicatorRaw,
} from './naver-types';

const BASE = 'https://stock.naver.com/api';

/**
 * Rate-limit 백오프 상태 (모듈 전역).
 *
 * 규칙:
 *  - 429/403/503 감지 시 backoffMs를 2배로 늘리고 `backoffUntil`까지 요청 일시중지
 *  - **단일 성공으로 리셋하지 않음** — 배치 중 일부만 429가 나올 때 백오프가 즉시 풀리는 것을 방지
 *  - 마지막 rate-limit 이후 COOLDOWN_MS(2분) 동안 추가 rate-limit 없으면 그제서야 backoffMs 초기화
 *  - 백오프 해제 시점에 ±20% jitter를 추가해 여러 요청이 동시에 깨어나 스파이크 유발 방지
 */
let backoffUntil = 0;
let backoffMs = 1_000;
let lastRateLimitAt = 0;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 5 * 60 * 1_000;
const BACKOFF_COOLDOWN_MS = 2 * 60 * 1_000;

const isRateLimitError = (msg: string): boolean =>
  /HTTP (429|403|503)/i.test(msg) || /rate.?limit/i.test(msg);

const markRateLimit = (url: string) => {
  lastRateLimitAt = Date.now();
  backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
  // jitter: ±20% 랜덤 오프셋 — 동시 깨어남 스파이크 방지
  const jittered = backoffMs * (0.8 + Math.random() * 0.4);
  backoffUntil = Date.now() + jittered;
  logger.error('Rate limit', `backoff ${Math.round(jittered)}ms — ${url}`);
};

const maybeResetBackoff = () => {
  // 마지막 rate-limit 이후 cooldown 경과 시 리셋 — 성공 한 번으로는 리셋 안 함
  if (lastRateLimitAt > 0 && Date.now() - lastRateLimitAt > BACKOFF_COOLDOWN_MS) {
    backoffMs = BACKOFF_MIN_MS;
    lastRateLimitAt = 0;
  }
};

// Electron 메인 프로세스 프록시 (CORS 우회) + rate-limit 백오프
const fetchJSON = async <T>(url: string): Promise<T> => {
  logger.api('Fetch', url.replace(BASE, ''));

  // 백오프 중이면 대기
  const now = Date.now();
  if (now < backoffUntil) {
    await new Promise(r => setTimeout(r, backoffUntil - now));
  }

  if (window.electronAPI?.naverFetch) {
    const result = await window.electronAPI.naverFetch(url);
    if (result.error) {
      if (isRateLimitError(result.error)) markRateLimit(url);
      else logger.error('API Error', `${result.error} — ${url}`);
      throw new Error(result.error);
    }
    maybeResetBackoff();
    return result.data as T;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const msg = `HTTP ${res.status}`;
    if (isRateLimitError(msg)) markRateLimit(url);
    else logger.error('HTTP Error', `${msg} — ${url}`);
    throw new Error(msg);
  }
  maybeResetBackoff();
  return res.json();
};

const parseDir = (val: number): 'up' | 'down' | 'flat' =>
  val > 0 ? 'up' : val < 0 ? 'down' : 'flat';

const num = (s: string): number => parseFloat((s || '0').replace(/,/g, ''));

// === Autocomplete ===
export const searchStocks = async (query: string): Promise<NaverAutoCompleteItem[]> => {
  if (!query.trim()) return [];
  const data = await fetchJSON<NaverAutoCompleteResponse>(
    `${BASE}/autocomplete/search/autoComplete?query=${encodeURIComponent(query)}&target=stock%2Cindex%2Cmarketindicator%2Ccoin%2Cipo`
  );
  const items = data.result?.items || [];
  logger.info('Search', `"${query}" → ${items.length}건`);
  return items;
};

// === Domestic Stock (Polling) ===
// polling API는 현재 시장(KRX/NXT) 가격을 자동 반환하므로 NXT 분기 불필요.

/** 국내주식 배치 polling — 10개씩 요청, 결과를 code→StockPrice 맵으로 반환 */
export const fetchDomesticStocksBatch = async (codes: string[]): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (codes.length === 0) return out;
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/domestic/stock?itemCodes=${encodeURIComponent(codes.join(','))}`
    );
    for (const d of resp.datas || []) {
      const code = d.itemCode || d.symbolCode || '';
      if (code) out[code] = parsePollingData(d, code, 'stock');
    }
  } catch (e) {
    logger.error('국내주식 배치조회 실패', `${codes.join(',')}: ${(e as Error).message}`);
  }
  return out;
};

// === Overseas Stock (Polling) ===
// 도메인이 polling.finance.naver.com — stock.naver.com과 다르지만 .naver.com 허용 범위 내.

/** 해외주식 배치 polling — 10개씩 요청 */
export const fetchOverseasStocksBatch = async (reutersCodes: string[]): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (reutersCodes.length === 0) return out;
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${OVERSEAS_POLLING_BASE}/${encodeURIComponent(reutersCodes.join(','))}`
    );
    for (const d of resp.datas || []) {
      const rc = d.reutersCode || '';
      const code = d.symbolCode || rc.split('.')[0] || '';
      if (code) out[code] = parsePollingData(d, code, 'stock');
    }
  } catch (e) {
    logger.error('해외주식 배치조회 실패', `${reutersCodes.join(',')}: ${(e as Error).message}`);
  }
  return out;
};

// === Index / Futures ===

interface NaverExchangeType {
  nameKor?: string;
  nameEng?: string;
  name?: string;
  nationCode?: string;
  nationName?: string;
}

// === 통합 Polling API ===
// 주식 · 지수 · 선물이 동일한 응답 구조를 공유.
// 엔드포인트:
//   국내 주식:      /api/polling/domestic/stock?itemCodes={codes}       (005930,000660 등)
//   국내 지수/선물: /api/polling/domestic/index?itemCodes={code}        (KOSPI, KPI100, FUT 등)
//   해외 주식:      polling.finance.naver.com/api/realtime/worldstock/stock/{codes} (NVDA.O,AAPL.O 등)
//   해외 지수:      /api/polling/worldstock/index?reutersCodes={code}   (.IXIC, .DJI 등)
//   해외 선물:      /api/polling/worldstock/futures?reutersCodes={code} (NQcv1, ESv1 등)

const OVERSEAS_POLLING_BASE = 'https://polling.finance.naver.com/api/realtime/worldstock/stock';

interface NaverPollingData {
  itemCode?: string;
  reutersCode?: string;
  symbolCode?: string;
  stockName?: string;       // 국내 주식/지수/선물
  indexName?: string;        // 해외 지수
  futuresName?: string;      // 해외 선물
  closePriceRaw?: string;
  compareToPreviousClosePriceRaw?: string;
  compareToPreviousPrice?: { code?: string; text?: string; name?: string };
  fluctuationsRatioRaw?: string;
  openPriceRaw?: string;
  highPriceRaw?: string;
  lowPriceRaw?: string;
  accumulatedTradingVolume?: string;   // "15,219,364" 또는 "513,186천주"
  accumulatedTradingValue?: string;    // "3,274,166백만" 또는 "368억 USD"
  accumulatedTradingVolumeRaw?: string;
  accumulatedTradingValueRaw?: string;
  marketStatus?: string;
  localTradedAt?: string;
  stockExchangeType?: NaverExchangeType;
  // 주식 전용 필드 (지수/선물에는 없음)
  currencyType?: { code?: string };
  tradeStopType?: { code?: string };
  marketValueFullRaw?: string;         // 시가총액 원시값
  marketValueFull?: string;            // "1,262,796,179,328,000"
  marketValueHangeul?: string;         // "4조 8,325억 USD" (해외)
  // 시간외(NXT) / 정규장 실시간 가격 — 최상위 closePrice보다 최신
  overMarketPriceInfo?: {
    tradingSessionType?: string;       // 'REGULAR_MARKET' | 'PRE_MARKET' | 'AFTER_MARKET'
    overMarketStatus?: string;         // 'OPEN' | 'CLOSE'
    overPrice?: string;                // 현재가 (포맷: "1,153,000")
    compareToPreviousPrice?: { code?: string };
    compareToPreviousClosePrice?: string;
    fluctuationsRatio?: string;
    localTradedAt?: string;
    openPrice?: string;
    highPrice?: string;
    lowPrice?: string;
    accumulatedTradingVolume?: string;
    accumulatedTradingValue?: string;
    tradeStopType?: { code?: string };
  };
}

interface NaverPollingResponse {
  datas?: NaverPollingData[];
}

type PollingCategory = 'stock' | 'index' | 'futures';

const NATION_CODE_MAP_POLLING: Record<string, string> = {
  KOR: 'KR', USA: 'US', JPN: 'JP', CHN: 'CN', HKG: 'HK', GBR: 'UK', DEU: 'DE', VNM: 'VN',
};

/** 시가총액 raw 값을 표시용 문자열로 포맷 (국내주식: "1262조" 식) */
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
 * 통합 Polling 파서 — 주식 · 지수 · 선물 공용.
 * category에 따라 currency, 시총, 거래정지 등 주식 전용 필드를 분기.
 *
 * 주식의 경우 overMarketPriceInfo가 활성(OPEN)이면 해당 가격을 우선 사용.
 * overMarketPriceInfo.overPrice는 정규장/NXT 프리장/시간외 무관하게
 * 현재 활성 세션의 최신 가격을 담고 있음.
 */
const parsePollingData = (d: NaverPollingData, code: string, category: PollingCategory): StockPrice => {
  const over = d.overMarketPriceInfo;
  // KRX 개장 중이면 최상위(KRX 가격), KRX 폐장 + NXT 활성이면 overPrice(NXT 가격)
  const useOver = d.marketStatus !== 'OPEN'
    && over?.overMarketStatus === 'OPEN'
    && !!over.overPrice;

  // overMarketPriceInfo가 활성이면 해당 가격 사용, 아니면 최상위 필드 폴백
  const price = useOver
    ? num(over!.overPrice!) : parseFloat(d.closePriceRaw || '0') || 0;
  const changeRaw = useOver
    ? over!.compareToPreviousClosePrice || '0' : d.compareToPreviousClosePriceRaw || '0';
  const change = parseFloat(changeRaw.replace(/,/g, '')) || 0;
  const pctRaw = useOver
    ? over!.fluctuationsRatio || '0' : d.fluctuationsRatioRaw || '0';
  const pct = parseFloat(pctRaw) || 0;

  const dirSource = useOver ? over!.compareToPreviousPrice : d.compareToPreviousPrice;
  const dirCode = dirSource?.code;
  let dir = 0;
  if (dirCode === '1' || dirCode === '2') dir = 1;
  else if (dirCode === '4' || dirCode === '5') dir = -1;
  if (dir === 0 && pct !== 0) dir = pct > 0 ? 1 : -1;

  // 이름: futuresName(해외선물) > indexName(해외지수) > stockName(국내/주식) > symbolCode
  const name = d.futuresName || d.indexName || d.stockName || d.symbolCode || code;

  const nationRaw = d.stockExchangeType?.nationCode || '';
  // nationCode 누락 시 국내 지수/선물이 'US'로 잘못 분류되는 것을 방지
  const nation = NATION_CODE_MAP_POLLING[nationRaw] || nationRaw || '';

  const exchangeRaw = d.stockExchangeType?.nameKor || d.stockExchangeType?.name || '';
  const exchange = exchangeRaw.replace(/ ?증권거래소$/, '');

  // 거래량/거래대금: over가 활성이면 해당 세션 값 우선
  const vol = useOver
    ? (over!.accumulatedTradingVolume || d.accumulatedTradingVolume || d.accumulatedTradingVolumeRaw)
    : (d.accumulatedTradingVolume || d.accumulatedTradingVolumeRaw);
  const val = useOver
    ? (over!.accumulatedTradingValue || d.accumulatedTradingValue || d.accumulatedTradingValueRaw)
    : (d.accumulatedTradingValue || d.accumulatedTradingValueRaw);

  const isStock = category === 'stock';

  // 시총: 해외는 marketValueHangeul("4조 8,325억 USD"), 국내는 raw를 포맷
  const marketCap = isStock
    ? (d.marketValueHangeul || fmtMarketCapKr(d.marketValueFullRaw))
    : undefined;
  const marketCapRaw = isStock && d.marketValueFullRaw
    ? Number(d.marketValueFullRaw) : undefined;

  // 시장 상태: over가 있으면 overMarketStatus를 사용
  const marketOpen = useOver
    ? over!.overMarketStatus === 'OPEN'
    : d.marketStatus === 'OPEN';

  // 시가/고가/저가: over 활성 시 해당 세션 값 우선
  const openPrice = useOver ? num(over!.openPrice || '0') : parseFloat(d.openPriceRaw || '0') || undefined;
  const highPrice = useOver ? num(over!.highPrice || '0') : parseFloat(d.highPriceRaw || '0') || undefined;
  const lowPrice = useOver ? num(over!.lowPrice || '0') : parseFloat(d.lowPriceRaw || '0') || undefined;

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

/** 국내 지수/선물 — KOSPI, KPI100, KOSDAQ, FUT 등 (같은 엔드포인트) */
export const fetchDomesticIndex = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/domestic/index?itemCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
    // code에서 카테고리 추론: FUT은 선물, 나머지는 지수
    const cat = code.toUpperCase() === 'FUT' ? 'futures' : 'index';
    return parsePollingData(d, code, cat);
  } catch (e) {
    logger.error('국내지수/선물 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

/** 해외 지수 — .IXIC, .DJI, .NDX 등 */
export const fetchOverseasIndex = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/worldstock/index?reutersCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
    return parsePollingData(d, code, 'index');
  } catch (e) {
    logger.error('해외지수 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

/** 해외 선물 — NQcv1, ESv1 등 */
export const fetchOverseasFutures = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/worldstock/futures?reutersCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
    return parsePollingData(d, code, 'futures');
  } catch (e) {
    logger.error('해외선물 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

// === Indices ===
export const fetchDomesticIndices = async (): Promise<MarqueeItem[]> => {
  try {
    const data = await fetchJSON<NaverIndexPollingRaw>(`${BASE}/polling/domestic/index?itemCodes=KOSPI%2CKOSDAQ%2CKPI200`);
    return (data.datas || []).map(d => {
      const dir = d.compareToPreviousPrice?.code === '2' ? 1 : d.compareToPreviousPrice?.code === '5' ? -1 : 0;
      const c = parseFloat(d.compareToPreviousClosePriceRaw || '0');
      const p = parseFloat(d.fluctuationsRatioRaw || '0');
      return {
        code: d.itemCode ?? '', name: d.stockName || d.itemCode || '',
        currentValue: parseFloat(d.closePriceRaw || '0'),
        change: dir >= 0 ? c : -c, changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'index' as const,
      };
    });
  } catch (e) { logger.error('국내지수', (e as Error).message); return []; }
};

export const fetchWorldIndices = async (): Promise<MarqueeItem[]> => {
  try {
    const data = await fetchJSON<NaverIndexPollingRaw>(`${BASE}/polling/worldstock/index?reutersCodes=.DJI%2C.INX%2C.IXIC%2C.N225%2C.HSI%2C.FTSE%2C.GDAXI`);
    return (data.datas || []).map(d => {
      const dir = d.compareToPreviousPrice?.code === '2' ? 1 : d.compareToPreviousPrice?.code === '5' ? -1 : 0;
      const c = parseFloat(d.compareToPreviousClosePriceRaw || '0');
      const p = parseFloat(d.fluctuationsRatioRaw || '0');
      return {
        code: d.reutersCode || d.symbolCode || '', name: d.indexName || d.reutersCode || '',
        currentValue: parseFloat(d.closePriceRaw || '0'),
        change: dir >= 0 ? c : -c, changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'index' as const,
      };
    });
  } catch (e) { logger.error('세계지수', (e as Error).message); return []; }
};

// 원자재 배치 호출 — metals 7개 + energy 5개 = 총 2회 요청
const METALS_CODES = 'GCcv1,M04020000,SIcv1,HGcv1,PLcv1,PAcv1,TIOc1';
const ENERGY_CODES = 'CLcv1,LCOcv1,RBcv1,HOcv1,DCBc1';

const parseCommodityItem = (d: NaverCommodityItemRaw, type: MarqueeItem['type']): MarqueeItem => {
  const c = parseFloat(d.fluctuations || '0');
  const dir = d.fluctuationsType?.code === '2' ? 1 : d.fluctuationsType?.code === '5' ? -1 : 0;
  return {
    code: d.reutersCode || d.symbolCode || '',
    name: d.name || d.symbolCode || '',
    currentValue: num(d.closePrice || '0'),
    change: dir >= 0 ? c : -c,
    changePercent: dir >= 0 ? parseFloat(d.fluctuationsRatio || '0') : -parseFloat(d.fluctuationsRatio || '0'),
    changeDirection: parseDir(dir),
    type,
  };
};

export const fetchCommodities = async (): Promise<MarqueeItem[]> => {
  const out: MarqueeItem[] = [];
  try {
    const [metals, energy] = await Promise.all([
      fetchJSON<NaverCommodityPollingRaw>(`${BASE}/polling/marketindex/metals/${METALS_CODES}`),
      fetchJSON<NaverCommodityPollingRaw>(`${BASE}/polling/marketindex/energy/${ENERGY_CODES}`),
    ]);
    for (const d of metals.datas || []) out.push(parseCommodityItem(d, 'metals'));
    for (const d of energy.datas || []) out.push(parseCommodityItem(d, 'energy'));
  } catch (e) {
    logger.error('원자재', (e as Error).message);
  }
  return out;
};

// === FX: api.stock.naver.com 환율 API 사용 ===
const FX_API = 'https://api.stock.naver.com/marketindex/exchange';
const FX_CODES = ['FX_USDKRW', 'FX_JPYKRW', 'FX_EURKRW', 'FX_CNYKRW'];
const FX_NAMES: Record<string, string> = { FX_USDKRW: 'USD/KRW', FX_JPYKRW: 'JPY/KRW', FX_EURKRW: 'EUR/KRW', FX_CNYKRW: 'CNY/KRW' };

export const fetchFXRates = async (): Promise<MarqueeItem[]> => {
  const results: MarqueeItem[] = [];
  for (const code of FX_CODES) {
    try {
      const d = await fetchJSON<NaverFXRaw>(`${FX_API}/${code}`);
      const info = d.exchangeInfo || d;
      const c = parseFloat(info.fluctuations || '0');
      const dir = info.fluctuationsType?.code === '2' ? 1 : info.fluctuationsType?.code === '5' ? -1 : 0;
      results.push({
        code, name: FX_NAMES[code] || info.name || code,
        currentValue: parseFloat(info.calcPrice || num(info.closePrice || '0').toString()),
        change: dir >= 0 ? c : -c,
        changePercent: dir >= 0 ? parseFloat(info.fluctuationsRatio || '0') : -parseFloat(info.fluctuationsRatio || '0'),
        changeDirection: parseDir(dir), type: 'fx',
      });
    } catch (e) { logger.warn(`환율 ${code}`, (e as Error).message); }
  }
  logger.info('환율', `${results.length}건 조회 (USD/KRW: ${results[0]?.currentValue || 'N/A'})`);
  return results;
};

// === 투자정보 (투자자별 매매동향 + 프로그램 + 등락종목) ===
export interface InvestorData {
  dealTrend: { personal: string; foreign: string; institutional: string };
  programTrend: { arbitrage: string; nonArbitrage: string; total: string };
  upDown: { rise: number; steady: number; fall: number; upper: number; lower: number };
}

export const fetchInvestorData = async (market: 'KOSPI' | 'KOSDAQ'): Promise<InvestorData | null> => {
  try {
    const d = await fetchJSON<NaverInvestorDataRaw>(`${BASE}/securityFe/api/index/${market}/integration`);
    const deal = d.dealTrendInfo || {};
    const prog = d.programTrendInfo || {};
    const ud = d.upDownStockInfo || {};
    return {
      dealTrend: {
        personal: deal.personalValue || '0',
        foreign: deal.foreignValue || '0',
        institutional: deal.institutionalValue || '0',
      },
      programTrend: {
        arbitrage: prog.indexDifferenceReal || '0',
        nonArbitrage: prog.indexBiDifferenceReal || '0',
        total: prog.indexTotalReal || '0',
      },
      upDown: {
        rise: parseInt(ud.riseCount || '0'),
        steady: parseInt(ud.steadyCount || '0'),
        fall: parseInt(ud.fallCount || '0'),
        upper: parseInt(ud.upperCount || '0'),
        lower: parseInt(ud.lowerCount || '0'),
      },
    };
  } catch (e) {
    logger.error('투자정보', `${market}: ${(e as Error).message}`);
    return null;
  }
};

// === 글로벌 실시간 랭킹 ===
export interface RankingItem {
  rank: number;
  code: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  changeDirection: 'up' | 'down' | 'flat';
  nation: string;
  reutersCode?: string;
  logoUrl?: string;
}

// 국내 랭킹: polling API (거래량 상위 1~10, 거래대금 상위 11~20)
// 미리 알려진 상위 종목코드를 polling에 넘기는 방식
const DOMESTIC_RANKING_CODES = '047040,008350,152550,003280,062970,010170,004410,032820,017900,011930,005930,000660,000250,005380,005935,034020,006360,000720,009150,003550';

export const fetchDomesticRanking = async (type: 'volume' | 'value'): Promise<RankingItem[]> => {
  try {
    const data = await fetchJSON<NaverDomesticRankingRaw>(
      `${BASE}/polling/domestic/stock?itemCodes=${encodeURIComponent(DOMESTIC_RANKING_CODES)}`
    );
    const items = data.datas || [];
    // 거래량/거래대금 기준 정렬
    const sorted = [...items].sort((a, b) => {
      const aVal = parseInt((type === 'volume' ? a.accumulatedTradingVolumeRaw : a.accumulatedTradingValueRaw) || '0');
      const bVal = parseInt((type === 'volume' ? b.accumulatedTradingVolumeRaw : b.accumulatedTradingValueRaw) || '0');
      return bVal - aVal;
    }).slice(0, 10);

    return sorted.map((d, i) => {
      const code = d.compareToPreviousPrice?.code;
      const dir = code === '2' || code === '1' ? 1 : code === '5' || code === '4' ? -1 : 0;
      return {
        rank: i + 1,
        code: d.itemCode || d.symbolCode || '',
        name: d.stockName || '',
        price: d.closePriceRaw || d.closePrice?.replace(/,/g, '') || '0',
        change: d.compareToPreviousClosePriceRaw || '0',
        changePercent: d.fluctuationsRatioRaw || d.fluctuationsRatio || '0',
        changeDirection: parseDir(dir),
        nation: 'KR',
      };
    });
  } catch (e) {
    logger.error('국내 랭킹', (e as Error).message);
    return [];
  }
};

// 해외 랭킹
type ForeignNation = 'USA' | 'CHN' | 'JPN' | 'HKG' | 'VNM';
const NATION_MAP_REVERSE: Record<ForeignNation, string> = { USA: 'US', CHN: 'CN', JPN: 'JP', HKG: 'HK', VNM: 'VN' };

const parseForeignDir = (val: NaverPriceDirection | string | undefined): number => {
  if (typeof val === 'string') {
    if (val === 'RISING' || val === 'UPPER_LIMIT') return 1;
    if (val === 'FALLING' || val === 'LOWER_LIMIT') return -1;
    return 0;
  }
  if (val?.code === '2' || val?.code === '1') return 1;
  if (val?.code === '5' || val?.code === '4') return -1;
  return 0;
};

export const fetchForeignRanking = async (nation: ForeignNation, type: 'volume' | 'value'): Promise<RankingItem[]> => {
  try {
    const orderType = type === 'volume' ? 'quantTop' : 'priceTop';
    const data = await fetchJSON<NaverForeignRankingRaw>(
      `${BASE}/foreign/market/stock/global?nation=${nation}&tradeType=ALL&orderType=${orderType}&startIdx=0&pageSize=10`
    );
    const items: NaverForeignRankingItemRaw[] = Array.isArray(data) ? data : (data.stocks || data.datas || []);
    return items.slice(0, 10).map((d, i) => {
      const dir = parseForeignDir(d.compareToPreviousPrice);
      return {
        rank: i + 1,
        code: d.symbolCode || d.stockCode || '',
        name: d.koreanCodeName || d.englishCodeName || d.stockName || '',
        price: d.currentPrice || d.closePrice || '0',
        change: d.compareToPreviousClosePrice || '0',
        changePercent: d.fluctuationsRatio || '0',
        changeDirection: parseDir(dir),
        nation: NATION_MAP_REVERSE[nation] || 'US',
        reutersCode: d.reutersCode,
      };
    });
  } catch (e) {
    logger.error('해외 랭킹', (e as Error).message);
    return [];
  }
};

// === 뉴스 API ===
export interface MarketBriefing {
  title: string;
  summary: string;
  detail: string;
  briefingDate: string;
  briefingHour: string;
  articles: { title: string; officeName: string; officeId: string; articleId: string }[];
}

export interface NewsArticle {
  title: string;
  datetime: string;
  subcontent: string;
  thumbUrl?: string;
  officeId: string;
  articleId: string;
  officeHname: string;
}

export interface MoneyStory {
  id: number;
  title: string;
  imageUrl: string;
  aiSummary: string;
  teaser: string;
  displayAt: string;
  viewCount: number;
  categoryName: string;
  channelName: string;
  channelId: number;
  mainCategoryId: number;
}

export const fetchMarketBriefing = async (): Promise<MarketBriefing | null> => {
  try {
    const d = await fetchJSON<NaverMarketBriefingRaw>(`${BASE}/securityAi/marketBriefing/current?marketBriefing=domain`);
    if (!d?.enabled) return null;
    return {
      title: d.title || '', summary: d.summary || '', detail: d.detail || '',
      briefingDate: d.briefingDate || '', briefingHour: d.briefingHour || '',
      articles: (d.articles || []).map(a => ({
        title: a.title ?? '', officeName: a.officeName ?? '', officeId: a.officeId ?? '', articleId: a.articleId ?? '',
      })),
    };
  } catch (e) { logger.error('AI 브리핑', (e as Error).message); return null; }
};

export const fetchMainNews = async (pageSize: number = 50): Promise<NewsArticle[]> => {
  try {
    const d = await fetchJSON<NaverNewsListRaw>(`${BASE}/domestic/news/list?category=MAINNEWS&page=1&pageSize=${pageSize}`);
    return (d.articles || []).map(a => ({
      title: a.title ?? '', datetime: a.datetime ?? '', subcontent: a.subcontent ?? '',
      thumbUrl: a.thumbUrl, officeId: a.officeId ?? '', articleId: a.articleId ?? '',
      officeHname: a.officeHname ?? '',
    }));
  } catch (e) { logger.error('메인뉴스', (e as Error).message); return []; }
};

export const fetchMoneyStory = async (size: number = 50): Promise<MoneyStory[]> => {
  try {
    const d = await fetchJSON<NaverMoneyStoryRaw>(`${BASE}/content/moneyStory?mainCategoryIdList=1&size=${size}`);
    return (d.moneyContentList || []).map(m => ({
      id: m.id ?? 0, title: m.title ?? '', imageUrl: m.imageUrl ?? '',
      aiSummary: m.aiSummary || '', teaser: (m.teaser || '').replace(/<[^>]+>/g, ''),
      displayAt: m.displayAt ?? '', viewCount: m.viewCount ?? 0,
      categoryName: m.category?.subName || m.category?.mainName || '',
      channelName: m.channel?.name || '',
      channelId: m.channel?.id ?? 0,
      mainCategoryId: m.category?.mainId ?? 1,
    }));
  } catch (e) { logger.error('머니스토리', (e as Error).message); return []; }
};

export const getNewsUrl = (officeId: string, articleId: string) =>
  `https://n.news.naver.com/article/${officeId}/${articleId}`;

export const getNaverStockUrl = (symbol: Pick<StockSymbol, 'code' | 'nation' | 'reutersCode'> & Partial<Pick<StockSymbol, 'market' | 'category'>>) => {
  // StockSymbol 전체가 아니어도 동작 — market/category는 있으면 inferCategory에 쓰임
  const cat = inferCategory(symbol as StockSymbol);

  // 지수/선물: fetchOne과 동일한 code-pattern 기반 라우팅.
  // nation 기반 라우팅을 쓰면 자동완성 API가 KPI100에 'INT' 같은 값을 주는 경우 깨짐.
  if (cat === 'index' || cat === 'futures') {
    const c = (symbol.code || '').toUpperCase();
    const rc = (symbol.reutersCode || '').toUpperCase();
    const ref = symbol.reutersCode || symbol.code;
    // 해외 지수: . 접두사 (.IXIC, .NDX, .DJI 등)
    if (c.startsWith('.') || rc.startsWith('.')) {
      return `https://m.stock.naver.com/worldstock/index/${ref}/price`;
    }
    // 해외 선물: CV{숫자} 패턴 (NQcv1, ESv1 등) — 경로가 /futures/ 임에 주의
    if (/CV\d+$/i.test(c) || /CV\d+$/i.test(rc)) {
      return `https://m.stock.naver.com/worldstock/futures/${ref}/price`;
    }
    // 그 외 = 국내 지수/선물 (KPI100, KPI200, KOSPI, KOSDAQ, FUT 등)
    return `https://m.stock.naver.com/domestic/index/${symbol.code}/price`;
  }

  // 일반 주식 — 모바일 도메인
  return symbol.nation === 'KR'
    ? `https://m.stock.naver.com/domestic/stock/${symbol.code}/total`
    : `https://m.stock.naver.com/worldstock/stock/${symbol.reutersCode || symbol.code}/total`;
};

// === 경제 캘린더 ===
export interface EconomicIndicator {
  name: string;
  nation: 'KR' | 'US' | string;
  nationName: string;
  releaseDate: string;       // 'YYYYMMDD'
  releaseTime: string;       // 'HH:mm'
  isReleased: boolean;
  actualValue: number;
  previousValue: number;
  changeValue: number;
  importance: number;        // 4=매우높음, 3=높음, 2=보통, 1=낮음
  unit: string;
  period: string;            // 'Q4 2025' 등
}

const NATION_CODE_MAP: Record<string, string> = { KOR: 'KR', USA: 'US' };

/** HHmmss → HH:mm */
const fmtTime = (raw: string): string => {
  if (!raw) return '';
  const s = raw.replace(/[^0-9]/g, '');
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return raw;
};

const parseIndicator = (d: NaverEconomicIndicatorRaw): EconomicIndicator => ({
  name: d.name || '',
  nation: NATION_CODE_MAP[d.nationType || ''] || d.nationType || '',
  nationName: d.nationKoreanName || '',
  releaseDate: d.releaseDate || '',
  releaseTime: fmtTime(d.releaseTime || ''),
  isReleased: d.isRelease === true,
  actualValue: d.actualValue ?? 0,
  previousValue: d.previousValue ?? 0,
  changeValue: d.changeValue ?? 0,
  importance: d.importance ?? 1,
  unit: d.indicatorUnit || '',
  period: d.period || '',
});

export const fetchEconomicCalendar = async (date: string): Promise<EconomicIndicator[]> => {
  try {
    const raw = await fetchJSON<NaverEconomicCalendarRaw>(
      `${BASE}/securityService/economic/indicator/nations/releaseDate?nationTypeList=KOR&nationTypeList=USA&page=1&pageSize=100&releaseDate=${date}`
    );
    const items = (raw.indicators || []).map(parseIndicator);
    logger.info('경제캘린더', `${date} → ${items.length}건`);
    return items;
  } catch (e) {
    logger.error('경제캘린더', (e as Error).message);
    return [];
  }
};

// === 금리 ===

export interface InterestRateItem {
  name: string;
  rate: string;             // "3.75", "2.516"
  change: string;           // "0.00", "-0.010"
  changeRatio: string;      // "-", "-0.39"
  direction: 'up' | 'down' | 'flat';
  date: string;             // "2026-04-15"
  nextReleaseDate?: string; // "20260430" (기준금리만)
  nation?: string;          // "USA", "KOR" (기준금리만)
  nationName?: string;      // "미국", "대한민국"
  description?: string;     // 금리 설명 (국내금리만)
}

interface InterestRateRaw {
  name?: string;
  closePrice?: string;
  fluctuations?: string;
  fluctuationsRatio?: string;
  fluctuationsType?: { code?: string };
  localTradedAt?: string;
  nextReleaseKoreaDate?: string;
  nationType?: string;
  nationName?: string;
  description?: string;
}

const parseInterestRate = (d: InterestRateRaw): InterestRateItem => {
  const dirCode = d.fluctuationsType?.code;
  const dir = dirCode === '2' || dirCode === '1' ? 'up' : dirCode === '5' || dirCode === '4' ? 'down' : 'flat';
  const dateStr = d.localTradedAt ? d.localTradedAt.split('T')[0] : '';
  return {
    name: d.name || '',
    rate: d.closePrice || '0',
    change: d.fluctuations || '0',
    changeRatio: d.fluctuationsRatio || '-',
    direction: dir,
    date: dateStr,
    nextReleaseDate: d.nextReleaseKoreaDate || undefined,
    nation: d.nationType || undefined,
    nationName: d.nationName || undefined,
    description: d.description || undefined,
  };
};

export const fetchStandardInterest = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(
      `${BASE}/securityService/marketindex/majors/standardInterest`
    );
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('기준금리', (e as Error).message);
    return [];
  }
};

export const fetchDomesticInterest = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(
      `${BASE}/securityService/marketindex/majors/domesticInterest`
    );
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('국내금리', (e as Error).message);
    return [];
  }
};
