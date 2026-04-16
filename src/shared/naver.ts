import { NaverAutoCompleteResponse, NaverAutoCompleteItem, StockPrice, StockSymbol, MarqueeItem, inferCategory } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import type {
  NaverDomesticDetailRaw,
  NaverOverseasDetailRaw,
  NaverIndexPollingRaw,
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

// 해외 marketValue 파싱 — "$2.94T", "500.2B", "123,456" 등 다양한 포맷 대응
const parseMarketValue = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  const cleaned = s.replace(/[$,\s]/g, '');
  const match = cleaned.match(/^(-?\d+\.?\d*)([TBMK])?$/i);
  if (!match) {
    const n = parseFloat(cleaned);
    return isNaN(n) ? undefined : n;
  }
  const val = parseFloat(match[1]);
  const unit = (match[2] || '').toUpperCase();
  const multiplier = unit === 'T' ? 1e12 : unit === 'B' ? 1e9 : unit === 'M' ? 1e6 : unit === 'K' ? 1e3 : 1;
  return val * multiplier;
};

// 한화 시총 파싱 — "6,795조 9,242억원" → 6,795,924,200,000,000 (원)
const parseKrwMarketValue = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  let total = 0;
  const jo = s.match(/([\d,]+)조/);
  const eok = s.match(/([\d,]+)억/);
  if (jo) total += parseFloat(jo[1].replace(/,/g, '')) * 1e12;
  if (eok) total += parseFloat(eok[1].replace(/,/g, '')) * 1e8;
  return total > 0 ? total : undefined;
};

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

// === Domestic Stock ===
// NOTE: 국내주식 API의 prevChangePrice는 항상 양수로 옴.
// 등락 방향은 upDownGb 코드('2'=상승, '5'=하락)로 판단하고,
// change/changePercent에 부호를 직접 적용 (dir 기반).
// WARNING: change 값 자체의 부호를 신뢰하면 안 됨 — 이전에 화살표 반전 버그의 원인이었음.

// ── 시장 스케줄 기반 KRX/NXT 분기 ──────────────────
// 앱 시작 + 일 1회 market/info API로 장 시간 캐싱.
// 현재 시각과 비교하여 KRX/NXT 분기 — 프로빙 호출 불필요.

interface MarketSchedule {
  krxOpen: number; krxClose: number;
  nxtPreOpen: number; nxtPreClose: number;
  nxtAfterOpen: number; nxtAfterClose: number;
}
let scheduleCache: MarketSchedule | null = null;
let scheduleCacheDate = '';

/** 종목별 NXT 지원 여부 — sosok API, 일 1회 캐싱 */
const nxtSupportCache = new Map<string, boolean>();
const nxtPendingChecks = new Map<string, Promise<boolean>>();
let nxtSupportCacheDate = '';

/** KRX/NXT 장 시간 조회 — 일 1회 캐싱 */
const getMarketSchedule = async (): Promise<MarketSchedule | null> => {
  const today = new Date().toDateString();
  if (scheduleCacheDate === today && scheduleCache) return scheduleCache;
  try {
    const [krx, nxt] = await Promise.all([
      fetchJSON<{ regularMarketOpeningTime: string; regularMarketClosingTime: string }>(
        `${BASE}/domestic/market/KRX/info`),
      fetchJSON<{ preMarketOpeningTime: string; preMarketClosingTime: string; afterMarketOpeningTime: string; afterMarketClosingTime: string }>(
        `${BASE}/domestic/market/NXT/info`),
    ]);
    const t = (s: string) => new Date(s).getTime();
    scheduleCache = {
      krxOpen: t(krx.regularMarketOpeningTime),
      krxClose: t(krx.regularMarketClosingTime),
      nxtPreOpen: t(nxt.preMarketOpeningTime),
      nxtPreClose: t(nxt.preMarketClosingTime),
      nxtAfterOpen: t(nxt.afterMarketOpeningTime),
      nxtAfterClose: t(nxt.afterMarketClosingTime),
    };
    scheduleCacheDate = today;
    return scheduleCache;
  } catch {
    // API 실패 시 이전 캐시라도 재사용 (장 시간은 평일 대부분 동일)
    return scheduleCache;
  }
};

/** 현재 시각 기준 활성 시장 판별 — timestamp 비교 (타임존 안전) */
const getActiveMarket = (s: MarketSchedule): 'KRX' | 'NXT' | null => {
  const now = Date.now();
  // KRX 정규장 (09:00~15:30) — NXT 정규장과 겹치지만 KRX 우선
  if (now >= s.krxOpen && now < s.krxClose) return 'KRX';
  // NXT 프리장 (08:00~08:50) — KRX 개장 전
  if (now >= s.nxtPreOpen && now < s.nxtPreClose) return 'NXT';
  // NXT 시간외 (15:40~20:00) — KRX 폐장 후
  if (now >= s.nxtAfterOpen && now < s.nxtAfterClose) return 'NXT';
  return null;
};

/** sosok API로 NXT 지원 여부 확인 — 일 1회 캐싱, 병렬 중복 호출 방지 */
const isNxtSupported = async (code: string): Promise<boolean> => {
  const today = new Date().toDateString();
  if (nxtSupportCacheDate !== today) {
    nxtSupportCache.clear();
    nxtPendingChecks.clear();
    nxtSupportCacheDate = today;
  }
  const cached = nxtSupportCache.get(code);
  if (cached !== undefined) return cached;
  const pending = nxtPendingChecks.get(code);
  if (pending) return pending;
  const check = fetchJSON<{ isNxtYn?: string }>(`${BASE}/domestic/detail/${code}/sosok`)
    .then(d => {
      const supported = d.isNxtYn === 'Y';
      nxtSupportCache.set(code, supported);
      return supported;
    })
    .catch(() => false)
    .finally(() => nxtPendingChecks.delete(code));
  nxtPendingChecks.set(code, check);
  return check;
};

/** API 응답을 StockPrice로 변환하는 공통 파서 */
const parseDomesticResponse = (d: NaverDomesticDetailRaw, code: string, codeType: string): StockPrice => {
  const change = num(d.prevChangePrice);
  const pct = parseFloat(d.prevChangeRate || '0');
  const dir = d.upDownGb === '2' ? 1 : d.upDownGb === '5' ? -1 : 0;
  const exchange = d.sosok === '0' ? 'KOSPI' : 'KOSDAQ';
  return {
    code: d.itemcode || code, name: d.itemname || code,
    nation: 'KR', market: exchange,
    currentPrice: num(d.nowPrice), previousClose: num(d.prevClosePrice || d.stdPrice || '0'),
    change: dir >= 0 ? change : -change, changePercent: dir >= 0 ? pct : -pct,
    changeDirection: parseDir(dir), currency: 'KRW',
    marketStatus: d.marketStatus === 'OPEN' ? 'OPEN' : 'CLOSE',
    updatedAt: d.tradeTime || new Date().toISOString(),
    exchange: codeType === 'NXT' ? `${exchange} NXT` : exchange,
    openPrice: num(d.openPrice), highPrice: num(d.highPrice), lowPrice: num(d.lowPrice),
    volume: d.tradeVolume ? Number(d.tradeVolume).toLocaleString() : undefined,
    tradingValue: d.tradeAmount ? `${(Number(d.tradeAmount) / 100_000_000).toFixed(0)}억` : undefined,
    marketCap: d.marketSum ? `${(Number(d.marketSum) / 1_000_000_000_000).toFixed(1)}조` : undefined,
    marketCapRaw: d.marketSum ? Number(d.marketSum) : undefined,
    per: d.per || undefined, pbr: d.pbr || undefined,
    week52High: d.week52HighPrice ? num(d.week52HighPrice) : undefined,
    week52Low: d.week52LowPrice ? num(d.week52LowPrice) : undefined,
    isTradingHalt: d.tradeStopYn === 'Y' || d.isTradingHalt === 'Y',
  };
};

const fetchDomesticByType = async (code: string, codeType: 'KRX' | 'NXT'): Promise<StockPrice | null> => {
  const d = await fetchJSON<NaverDomesticDetailRaw>(`${BASE}/domestic/detail/${code}/detail?codeType=${codeType}`);
  return parseDomesticResponse(d, code, codeType);
};

export const fetchDomesticStock = async (code: string): Promise<StockPrice | null> => {
  try {
    const schedule = await getMarketSchedule();
    const active = schedule ? getActiveMarket(schedule) : null;

    // KRX 장중 → KRX 직행
    if (active === 'KRX') return await fetchDomesticByType(code, 'KRX');

    // NXT 시간외 장중 → NXT 지원 종목만 NXT, 미지원은 KRX
    if (active === 'NXT') {
      if (await isNxtSupported(code)) return await fetchDomesticByType(code, 'NXT');
      return await fetchDomesticByType(code, 'KRX');
    }

    // 폐장 또는 스케줄 조회 실패 → KRX (가장 최근 종가)
    return await fetchDomesticByType(code, 'KRX');
  } catch (e) {
    logger.error('국내주식 조회 실패', `${code}: ${(e as Error).message}`);
    return null;
  }
};

// === Index / Futures ===
// 국내 지수: /securityFe/api/index/{code}/basic
// 해외 지수·선물: /securityFe/api/futures/{code}/basic
// 응답 필드가 주식과 완전히 다르므로 별도 파서 사용.

interface NaverExchangeType {
  nameKor?: string;
  nameEng?: string;
  name?: string;
  nationCode?: string;
  nationName?: string;
}

// === 지수 · 선물 Polling API ===
// 엔드포인트:
//   국내 지수/선물: /api/polling/domestic/index?itemCodes={code}        (KOSPI, KPI100, FUT 등)
//   해외 지수:      /api/polling/worldstock/index?reutersCodes={code}   (.IXIC, .DJI 등)
//   해외 선물:      /api/polling/worldstock/futures?reutersCodes={code} (NQcv1, ESv1 등)

interface NaverPollingData {
  itemCode?: string;
  reutersCode?: string;
  symbolCode?: string;
  stockName?: string;       // 국내 지수/선물
  indexName?: string;        // 해외 지수
  futuresName?: string;      // 해외 선물
  closePriceRaw?: string;
  compareToPreviousClosePriceRaw?: string;
  compareToPreviousPrice?: { code?: string; text?: string; name?: string };
  fluctuationsRatioRaw?: string;
  openPriceRaw?: string;
  highPriceRaw?: string;
  lowPriceRaw?: string;
  accumulatedTradingVolume?: string;   // "513,186천주" (단위 포함 포맷)
  accumulatedTradingValue?: string;    // "12,360,108백만" (단위 포함 포맷)
  accumulatedTradingVolumeRaw?: string;
  accumulatedTradingValueRaw?: string;
  marketStatus?: string;
  localTradedAt?: string;
  stockExchangeType?: NaverExchangeType;
}

interface NaverPollingResponse {
  datas?: NaverPollingData[];
}

const parsePollingData = (d: NaverPollingData, code: string, category: 'index' | 'futures'): StockPrice => {
  const price = parseFloat(d.closePriceRaw || '0') || 0;
  const change = parseFloat(d.compareToPreviousClosePriceRaw || '0') || 0;
  const pct = parseFloat(d.fluctuationsRatioRaw || '0') || 0;
  const dirCode = d.compareToPreviousPrice?.code;
  let dir = 0;
  if (dirCode === '1' || dirCode === '2') dir = 1;
  else if (dirCode === '4' || dirCode === '5') dir = -1;
  if (dir === 0 && pct !== 0) dir = pct > 0 ? 1 : -1;

  // 이름: futuresName(해외선물) > indexName(해외지수) > stockName(국내) > symbolCode
  const name = d.futuresName || d.indexName || d.stockName || d.symbolCode || code;

  const nationRaw = d.stockExchangeType?.nationCode || 'USA';
  const nation = nationRaw === 'KOR' ? 'KR' : nationRaw === 'USA' ? 'US' : nationRaw;

  const exchange = d.stockExchangeType?.nameKor || d.stockExchangeType?.name || '';
  // 단위 포함 포맷 값 우선 ("513,186천주"), 없으면 raw 폴백
  const vol = d.accumulatedTradingVolume || d.accumulatedTradingVolumeRaw;
  const val = d.accumulatedTradingValue || d.accumulatedTradingValueRaw;

  return {
    code: d.itemCode || d.symbolCode || code,
    name,
    nation,
    market: category === 'index' ? '지수' : '선물',
    currentPrice: price,
    previousClose: price - change,
    change: dir >= 0 ? Math.abs(change) : -Math.abs(change),
    changePercent: dir >= 0 ? Math.abs(pct) : -Math.abs(pct),
    changeDirection: parseDir(dir),
    currency: '',   // 지수/선물은 통화 단위 없음
    marketStatus: d.marketStatus === 'OPEN' ? 'OPEN' : 'CLOSE',
    updatedAt: d.localTradedAt || new Date().toISOString(),
    reutersCode: d.reutersCode,
    exchange,
    isTradingHalt: false,
    // 보조 데이터 — 종목상세 모달에서 표시
    openPrice: parseFloat(d.openPriceRaw || '0') || undefined,
    highPrice: parseFloat(d.highPriceRaw || '0') || undefined,
    lowPrice: parseFloat(d.lowPriceRaw || '0') || undefined,
    volume: vol && vol !== '' && vol !== '-' ? vol : undefined,
    tradingValue: val && val !== '' && val !== '-' ? val : undefined,
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

// === Overseas Stock ===
export const fetchOverseasStock = async (reutersCode: string): Promise<StockPrice | null> => {
  try {
    const d = await fetchJSON<NaverOverseasDetailRaw>(`${BASE}/securityService/stock/${reutersCode}/basic`);
    const change = num(d.compareToPreviousClosePrice);
    const pct = parseFloat(d.fluctuationsRatio || '0');
    const ctp = d.compareToPreviousPrice;
    let dir = (typeof ctp === 'object' && (ctp?.code === '2' || ctp?.code === '1'))
      || ctp === 'RISING' || (typeof ctp === 'object' && (ctp?.name === 'RISING' || ctp?.name === 'UPPER_LIMIT'))
      ? 1
      : (typeof ctp === 'object' && (ctp?.code === '5' || ctp?.code === '4'))
        || ctp === 'FALLING' || (typeof ctp === 'object' && (ctp?.name === 'FALLING' || ctp?.name === 'LOWER_LIMIT'))
      ? -1
      : 0;
    // 폴백: 등락률 부호로 판단
    if (dir === 0 && pct !== 0) dir = pct > 0 ? 1 : -1;
    const nationMap: Record<string, string> = { USA: 'US', JPN: 'JP', CHN: 'CN', HKG: 'HK', VNM: 'VN' };
    const infos = d.stockItemTotalInfos || [];
    const getInfo = (code: string) => infos.find(i => i.code === code)?.value;
    const getInfoDesc = (code: string) => infos.find(i => i.code === code)?.valueDesc;
    const exchange = d.stockExchangeType?.name || d.stockExchangeName || '';
    return {
      code: d.symbolCode || reutersCode.split('.')[0], name: d.stockName || reutersCode,
      nameEn: d.stockNameEng,
      nation: nationMap[d.stockExchangeType?.nationCode ?? ''] || d.nationType || 'US',
      market: exchange, currentPrice: num(d.closePrice),
      previousClose: num(getInfo('basePrice') || '0'),
      change, changePercent: pct,
      changeDirection: parseDir(dir), currency: d.currencyType?.code || 'USD',
      marketStatus: d.marketStatus === 'OPEN' ? 'OPEN' : 'CLOSE',
      updatedAt: d.localTradedAt || new Date().toISOString(), reutersCode,
      exchange,
      openPrice: num(getInfo('openPrice') || '0'),
      highPrice: num(getInfo('highPrice') || '0'),
      lowPrice: num(getInfo('lowPrice') || '0'),
      volume: getInfo('accumulatedTradingVolume'),
      tradingValue: getInfo('accumulatedTradingValue'),
      marketCap: getInfo('marketValue'),
      marketCapRaw: parseKrwMarketValue(getInfoDesc('marketValue')) || parseMarketValue(getInfo('marketValue')),
      per: getInfo('per'), pbr: getInfo('pbr'),
      week52High: getInfo('highPriceOf52Weeks') ? num(getInfo('highPriceOf52Weeks')!) : undefined,
      week52Low: getInfo('lowPriceOf52Weeks') ? num(getInfo('lowPriceOf52Weeks')!) : undefined,
      isTradingHalt: d.tradeStopType?.code !== '1',
    };
  } catch (e) {
    logger.error('해외주식 조회 실패', `${reutersCode}: ${(e as Error).message}`);
    return null;
  }
};

export const fetchStockPrice = async (symbol: { code: string; nation: string; reutersCode?: string }) =>
  symbol.nation === 'KR' ? fetchDomesticStock(symbol.code) : fetchOverseasStock(symbol.reutersCode || symbol.code);

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

export const fetchCommodities = async (): Promise<MarqueeItem[]> => {
  const targets = [{ path: 'metals/GCcv1', name: 'Gold' }, { path: 'energy/CLcv1', name: 'WTI' }];
  const out: MarqueeItem[] = [];
  for (const { path, name } of targets) {
    try {
      const raw = await fetchJSON<NaverCommodityPollingRaw>(`${BASE}/polling/marketindex/${path}`);
      const d = raw.datas?.[0] || raw; // 실제 응답: { datas: [{ ... }] }
      const c = parseFloat(d.fluctuations || '0');
      const dir = d.fluctuationsType?.code === '2' ? 1 : d.fluctuationsType?.code === '5' ? -1 : 0;
      out.push({
        code: path, name, currentValue: num(d.closePrice || '0'),
        change: dir >= 0 ? c : -c,
        changePercent: dir >= 0 ? parseFloat(d.fluctuationsRatio || '0') : -parseFloat(d.fluctuationsRatio || '0'),
        changeDirection: parseDir(dir), type: 'commodity',
      });
    } catch { /* skip */ }
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
