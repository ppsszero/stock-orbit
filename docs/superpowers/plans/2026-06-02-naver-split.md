# naver.ts 도메인 분할 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** god-module `src/shared/naver.ts`(1162줄/24 export)를 도메인별 모듈 폴더 `src/shared/naver/`로 분할하고, 정합성 핵심 transform에 단위 테스트를 추가한다. 동작·소비자 import 불변.

**Architecture:** 코드를 **로직 변경 없이 이동**한다. 최하단 코어(`client.ts`=fetchJSON/num/parseDir/백오프, `types.ts`=raw 응답 타입, `polling.ts`=공유 parsePollingData)를 먼저 만들고, 그 위에 12개 도메인 파일을 올린다. `index.ts` barrel이 24개 public 심볼을 그대로 re-export하므로 `@/shared/naver`를 import하는 소비자 22곳은 한 줄도 바뀌지 않는다. transform 순수함수는 각 도메인 파일에서 export해 테스트 가능하게 한다(하이브리드).

**Tech Stack:** TypeScript (strict), Vite, Vitest + jsdom, Emotion. 경로 별칭 `@/` → `src/`.

**검증 게이트(헌법 11.1):** `npx tsc --noEmit` 0 에러 / `npx eslint src/shared/naver` 0 경고 / `npm run test:run` green.

---

## 사양서 대비 정제 사항 (1건)

- 사양서는 `fetchMarketBriefing`을 `ranking.ts`에 배치했으나, 반환 타입 `MarketBriefing`이 뉴스 블록(소스 674–731)에 선언돼 있고 "AI 시황 브리핑" = 뉴스 도메인이므로 **`news.ts`로 이동**한다. `ranking.ts`는 순수 랭킹(`fetchDomesticRanking`/`fetchForeignRanking`)만 담당.

## 파일 구조 (최종)

```
src/shared/naver/
  client.ts       BASE, MOBILE_BASE, fetchJSON, num, parseDir, 백오프 상태(내부), describeApi(내부)
  types.ts        Naver raw 응답 타입 전부 (기존 naver-types.ts + naver.ts 인라인 raw 타입)
  polling.ts      PollingCategory, parsePollingData (+ 내부 fmtMarketCapKr, NATION_CODE_MAP_POLLING)
  stocks.ts       searchStocks, fetchDomesticStocksBatch, fetchOverseasStocksBatch
  indices.ts      fetchDomesticIndex, fetchOverseasIndex, fetchOverseasFutures, fetchDomesticIndices, fetchWorldIndices
  commodities.ts  parseCommodityItem(export), fetchCommodities
  fx.ts           fetchFXRates
  investor.ts     SignedValue, InvestorData, toSigned(export), fetchInvestorData
  ranking.ts      RankingItem, parseForeignDir(export), fetchDomesticRanking, fetchForeignRanking
  news.ts         MarketBriefing/NewsRelatedItem/NewsArticle/MoneyStory/NewsCategory, parseNewsDatetime(export),
                  fetchMarketBriefing, fetchNewsByCategory, fetchMoneyStory
  research.ts     ResearchCategory, ResearchItem, fetchResearchByCategory
  sectors.ts      SectorNation/SectorStock/Sector/SectorOverview, dirFromFluctuationsType(export), fetchSectors
  calendar.ts     EconomicIndicator, parseIndicator(export, 내부 fmtTime), fetchEconomicCalendar
  interest.ts     InterestRateItem, parseInterestRate(export), fetchStandardInterest/DomesticInterest/BondYield
  urls.ts         getNewsUrl, getNaverStockUrl
  index.ts        barrel — 위 전부 re-export
  __tests__/
    num.test.ts
    polling.test.ts
    transforms.test.ts
```

**의존 방향(순환 없음):** 모든 도메인 → `client` / `types`. `polling` → `client`+`types`. `stocks`/`indices` → `polling`. `urls`는 독립. `index`가 최상단.

**중요:** Task 1–5에서 새 파일들은 생성하되 `naver.ts`는 **그대로 둔다**(소비자는 계속 `naver.ts`로 해석됨, 새 파일은 아직 아무도 import 안 함 → 충돌 없음). Task 6에서 barrel 생성 + `naver.ts`/`naver-types.ts` 삭제를 **동시에** 수행해 `@/shared/naver`가 `naver/index.ts`로 전환된다.

---

## Task 1: 코어 3파일 (client / types / polling)

**Files:**
- Create: `src/shared/naver/client.ts`
- Create: `src/shared/naver/types.ts`
- Create: `src/shared/naver/polling.ts`

- [ ] **Step 1: `client.ts` 작성** (naver.ts 18–136에서 이동. `BASE`/`MOBILE_BASE`/`fetchJSON`/`num`/`parseDir`를 export로 승격, 나머지는 모듈 내부 유지)

```ts
import { logger } from '@/shared/utils/logger';

export const BASE = 'https://stock.naver.com/api';
export const MOBILE_BASE = 'https://m.stock.naver.com';

/**
 * Rate-limit 백오프 상태 (모듈 전역).
 *  - 429/403/503 감지 시 backoffMs를 2배로, backoffUntil까지 일시중지
 *  - 단일 성공으로 리셋하지 않음 (배치 중 일부 429에서 즉시 풀림 방지)
 *  - 마지막 rate-limit 이후 COOLDOWN_MS(2분) 무사고 시에만 리셋
 *  - 해제 시점 ±20% jitter로 동시 깨어남 스파이크 방지
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
  const jittered = backoffMs * (0.8 + Math.random() * 0.4);
  backoffUntil = Date.now() + jittered;
  logger.error('Rate limit', `backoff ${Math.round(jittered)}ms — ${url}`);
};

const maybeResetBackoff = () => {
  if (lastRateLimitAt > 0 && Date.now() - lastRateLimitAt > BACKOFF_COOLDOWN_MS) {
    backoffMs = BACKOFF_MIN_MS;
    lastRateLimitAt = 0;
  }
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  quantTop:  '거래량 상위',
  priceTop:  '거래대금 상위',
  searchTop: '검색 상위',
};
const NATION_LABELS: Record<string, string> = {
  USA: '미국', CHN: '중국', JPN: '일본', HKG: '홍콩', VNM: '베트남',
};

const describeApi = (path: string): string => {
  const [pathOnly, query] = path.split('?');
  const params = new URLSearchParams(query || '');

  if (pathOnly.startsWith('/polling/')) {
    const [, , region, kind] = pathOnly.split('/');
    const regionKr = region === 'domestic' ? '국내' : region === 'overseas' ? '해외' : region;
    const kindKr = kind === 'index' ? '지수' : kind === 'stock' ? '종목' : kind === 'futures' ? '선물' : kind;
    const items = params.get('itemCodes')?.split(',').filter(Boolean) || [];
    if (items.length === 0) return `${regionKr} ${kindKr} 폴링`;
    return `${regionKr} ${kindKr} 폴링 — ${items.length}개`;
  }

  if (pathOnly === '/domestic/market/stock/default') {
    const ot = params.get('orderType') || '';
    return `국내 ${ORDER_TYPE_LABELS[ot] || '랭킹'}`;
  }

  if (pathOnly === '/foreign/market/stock/global') {
    const ot = params.get('orderType') || '';
    const nation = params.get('nation') || '';
    return `${NATION_LABELS[nation] || nation} ${ORDER_TYPE_LABELS[ot] || '랭킹'}`;
  }

  const segments = pathOnly.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'Fetch';
};

/** Electron 메인 프로세스 프록시(CORS 우회) + rate-limit 백오프 */
export const fetchJSON = async <T>(url: string): Promise<T> => {
  const path = url.replace(BASE, '');
  logger.api(describeApi(path), path);

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

export const parseDir = (val: number): 'up' | 'down' | 'flat' =>
  val > 0 ? 'up' : val < 0 ? 'down' : 'flat';

/** "1,234.5" / undefined / "" / "abc" 모두 안전하게 number로. NaN은 0. */
export const num = (s: string | undefined | null): number =>
  parseFloat((s || '0').replace(/,/g, '')) || 0;
```

- [ ] **Step 2: `types.ts` 작성** (기존 `naver-types.ts` 전체 + `naver.ts` 인라인 raw 타입을 합침. 값 import 없음, 타입 선언만)

```ts
/**
 * 네이버 증권 API 원시 응답 타입
 * 공식 명세 없음 — 실제 응답 필드 접근 패턴에서 역추론.
 * 파싱 로직 변경 시 함께 업데이트.
 */

// ── 공통 ───────────────────────────────────────────────────────────────
/** 등락 방향 코드 ('2'=상승/'1'=상한가, '5'=하락/'4'=하한가, '3'=보합) */
export type NaverUpDownCode = '1' | '2' | '3' | '4' | '5';
export interface NaverPriceDirection {
  code: NaverUpDownCode;
  name?: string;
}

// ── 폴링: 국내·세계 지수 (마퀴용 경량 타입) ────────────────────────────
export interface NaverIndexItemRaw {
  itemCode?: string;
  reutersCode?: string;
  symbolCode?: string;
  stockName?: string;
  indexName?: string;
  closePriceRaw?: string;
  compareToPreviousClosePriceRaw?: string;
  fluctuationsRatioRaw?: string;
  compareToPreviousPrice?: NaverPriceDirection;
}
export interface NaverIndexPollingRaw {
  datas?: NaverIndexItemRaw[];
}

// ── 통합 폴링: 주식·지수·선물 공용 (parsePollingData 입력) ──────────────
export interface NaverExchangeType {
  nameKor?: string;
  nameEng?: string;
  name?: string;
  nationCode?: string;
  nationName?: string;
}
export interface NaverPollingData {
  itemCode?: string;
  reutersCode?: string;
  symbolCode?: string;
  stockName?: string;
  indexName?: string;
  futuresName?: string;
  closePriceRaw?: string;
  compareToPreviousClosePriceRaw?: string;
  compareToPreviousPrice?: { code?: string; text?: string; name?: string };
  fluctuationsRatioRaw?: string;
  openPriceRaw?: string;
  highPriceRaw?: string;
  lowPriceRaw?: string;
  accumulatedTradingVolume?: string;
  accumulatedTradingValue?: string;
  accumulatedTradingVolumeRaw?: string;
  accumulatedTradingValueRaw?: string;
  marketStatus?: string;
  localTradedAt?: string;
  stockExchangeType?: NaverExchangeType;
  currencyType?: { code?: string };
  tradeStopType?: { code?: string };
  marketValueFullRaw?: string;
  marketValueFull?: string;
  marketValueHangeul?: string;
  overMarketPriceInfo?: {
    tradingSessionType?: string;
    overMarketStatus?: string;
    overPrice?: string;
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
export interface NaverPollingResponse {
  datas?: NaverPollingData[];
}

// ── 원자재 ───────────────────────────────────────────────────────────────
export interface NaverCommodityItemRaw {
  reutersCode?: string;
  symbolCode?: string;
  name?: string;
  closePrice?: string;
  fluctuations?: string;
  fluctuationsRatio?: string;
  fluctuationsType?: { code: NaverUpDownCode };
  marketStatus?: string | null;
  localTradedAt?: string;
  unit?: string;
}

// ── 환율 ─────────────────────────────────────────────────────────────────
export interface NaverFXInfoRaw {
  name?: string;
  calcPrice?: string;
  closePrice?: string;
  fluctuations?: string;
  fluctuationsRatio?: string;
  fluctuationsType?: { code: NaverUpDownCode };
}
export interface NaverFXRaw extends NaverFXInfoRaw {
  exchangeInfo?: NaverFXInfoRaw;
}

// ── 국내 랭킹 ────────────────────────────────────────────────────────────
export interface NaverDomesticRankingNewItem {
  itemname?: string;
  itemcode?: string;
  /** 1/2=상승, 3=보합, 4/5=하락 */
  upDownGb?: string;
  nowPrice?: string;
  prevChangePrice?: string;
  prevChangeRate?: string;
}

// ── 해외 랭킹 ────────────────────────────────────────────────────────────
export interface NaverForeignRankingItemRaw {
  symbolCode?: string;
  stockCode?: string;
  koreanCodeName?: string;
  englishCodeName?: string;
  stockName?: string;
  currentPrice?: string;
  closePrice?: string;
  compareToPreviousClosePrice?: string;
  fluctuationsRatio?: string;
  compareToPreviousPrice?: NaverPriceDirection | string;
  reutersCode?: string;
}
export type NaverForeignRankingRaw =
  | NaverForeignRankingItemRaw[]
  | { stocks?: NaverForeignRankingItemRaw[]; datas?: NaverForeignRankingItemRaw[] };

// ── 지수 투자정보 ────────────────────────────────────────────────────────
export interface NaverInvestorDataRaw {
  dealTrendInfo?: { personalValue?: string; foreignValue?: string; institutionalValue?: string };
  programTrendInfo?: { indexDifferenceReal?: string; indexBiDifferenceReal?: string; indexTotalReal?: string };
  upDownStockInfo?: { riseCount?: string; steadyCount?: string; fallCount?: string; upperCount?: string; lowerCount?: string };
}

// ── 뉴스 ─────────────────────────────────────────────────────────────────
export interface NaverBriefingArticleRaw {
  title?: string;
  officeName?: string;
  officeId?: string;
  articleId?: string;
}
export interface NaverMarketBriefingRaw {
  enabled?: boolean;
  title?: string;
  summary?: string;
  detail?: string;
  briefingDate?: string;
  briefingHour?: string;
  articles?: NaverBriefingArticleRaw[];
}
export interface NewsRelatedItemRaw {
  reutersCode?: string;
  itemName?: string;
  fluctuationsRatio?: string;
  endUrl?: string;
}
export interface NewsCategoryItemRaw {
  articleId?: string;
  title?: string;
  titleFull?: string;
  body?: string;
  datetime?: string;
  officeId?: string;
  officeName?: string;
  imageOriginLink?: string | null;
  hasImage?: boolean | null;
  relatedItems?: NewsRelatedItemRaw[];
}
export interface NewsCategoryResponseRaw {
  isSuccess?: boolean;
  result?: NewsCategoryItemRaw[];
}

// ── 머니스토리 ───────────────────────────────────────────────────────────
export interface NaverMoneyStoryItemRaw {
  id?: number;
  title?: string;
  imageUrl?: string;
  aiSummary?: string;
  teaser?: string;
  displayAt?: string;
  viewCount?: number;
  category?: { subName?: string; mainName?: string; mainId?: number };
  channel?: { name?: string; id?: number };
}
export interface NaverMoneyStoryRaw {
  moneyContentList?: NaverMoneyStoryItemRaw[];
}

// ── 리서치 ───────────────────────────────────────────────────────────────
export interface ResearchItemRaw {
  researchId?: number;
  researchCategory?: string;
  category?: string;
  title?: string;
  brokerName?: string;
  writeDate?: string;
  readCount?: string;
  endUrl?: string;
  itemCode?: string;
  itemName?: string;
}
export interface ResearchResponseRaw {
  isSuccess?: boolean;
  result?: ResearchItemRaw[];
}

// ── 섹터 ─────────────────────────────────────────────────────────────────
export interface SectorStockItemRaw {
  name?: string;
  id?: string;
  itemCode?: string;
  reutersCode?: string;
  currentPrice?: number;
  currencyType?: string;
  fluctuationsType?: string;
  fluctuations?: string;
  fluctuationsRatio?: string;
  nationType?: string;
}
export interface SectorRaw {
  sectorCode?: string;
  sectorName?: string;
  changeRate?: number;
  totalMarketCap?: number;
  risingCount?: number;
  unChangedCount?: number;
  fallingCount?: number;
  items?: SectorStockItemRaw[];
}
export interface SectorOverviewRaw {
  isSuccess?: boolean;
  result?: {
    totalRisingCount?: number;
    totalUnChangedCount?: number;
    totalFallingCount?: number;
    sectors?: SectorRaw[];
  };
}

// ── 경제 캘린더 ──────────────────────────────────────────────────────────
export interface NaverEconomicIndicatorRaw {
  dataType?: string;
  reutersCode?: string;
  nationType?: string;
  nationKoreanName?: string;
  name?: string;
  releaseDate?: string;
  releaseTime?: string;
  importance?: number;
  period?: string;
  periodDate?: string;
  actualValue?: number;
  changeValue?: number;
  previousValue?: number;
  correctValue?: number;
  isRelease?: boolean;
  searchQuery?: string;
  category?: string;
  indicatorUnit?: string;
  unitScale?: string | null;
}
export interface NaverEconomicCalendarRaw {
  pageSize?: number;
  page?: number;
  totalCount?: number;
  indicators?: NaverEconomicIndicatorRaw[];
}

// ── 금리 ─────────────────────────────────────────────────────────────────
export interface InterestRateRaw {
  name?: string;
  itemCode?: string;
  code?: string;
  reutersCode?: string;
  symbolCode?: string;
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
```

- [ ] **Step 3: `polling.ts` 작성** (naver.ts 262–374에서 이동. `parsePollingData` export, `PollingCategory` export, 헬퍼는 내부)

```ts
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
  const useOver = d.marketStatus !== 'OPEN'
    && over?.overMarketStatus === 'OPEN'
    && !!over.overPrice;

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
```

- [ ] **Step 4: tsc로 새 파일 컴파일 확인** (naver.ts는 아직 존재 — 중복 타입은 다른 모듈이라 무해)

Run: `npx tsc --noEmit`
Expected: 0 errors. (만약 `window.electronAPI` 타입 에러가 나면 기존 naver.ts와 동일한 전역 타입을 쓰므로 발생하지 않아야 함.)

- [ ] **Step 5: 커밋**

```bash
git add src/shared/naver/client.ts src/shared/naver/types.ts src/shared/naver/polling.ts
git commit -m "$(cat <<'EOF'
refactor(naver): 코어 분리 — client/types/polling

fetchJSON/num/parseDir/백오프(client), raw 응답 타입(types),
공유 parsePollingData(polling)를 naver.ts에서 이동. 동작 불변.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: stocks.ts + indices.ts

**Files:**
- Create: `src/shared/naver/stocks.ts`
- Create: `src/shared/naver/indices.ts`

- [ ] **Step 1: `stocks.ts` 작성** (naver.ts 139–190, 211에서 이동)

```ts
import { StockPrice, NaverAutoCompleteResponse, NaverAutoCompleteItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON } from './client';
import { parsePollingData } from './polling';
import type { NaverPollingResponse } from './types';

const OVERSEAS_POLLING_BASE = 'https://polling.finance.naver.com/api/realtime/worldstock/stock';

export const searchStocks = async (query: string): Promise<NaverAutoCompleteItem[]> => {
  if (!query.trim()) return [];
  const data = await fetchJSON<NaverAutoCompleteResponse>(
    `${BASE}/autocomplete/search/autoComplete?query=${encodeURIComponent(query)}&target=stock%2Cindex%2Cmarketindicator%2Ccoin%2Cipo`
  );
  const items = data.result?.items || [];
  logger.info('Search', `"${query}" → ${items.length}건`);
  return items;
};

/** 국내주식 배치 polling — 10개씩, code→StockPrice 맵 */
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

/** 해외주식 배치 polling — 10개씩 */
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
```

- [ ] **Step 2: `indices.ts` 작성** (naver.ts 377–456에서 이동)

```ts
import { StockPrice, MarqueeItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON, num, parseDir } from './client';
import { parsePollingData } from './polling';
import type { NaverPollingResponse, NaverIndexPollingRaw } from './types';

/** 국내 지수/선물 — KOSPI, KPI100, KOSDAQ, FUT 등 */
export const fetchDomesticIndex = async (code: string): Promise<StockPrice | null> => {
  try {
    const resp = await fetchJSON<NaverPollingResponse>(
      `${BASE}/polling/domestic/index?itemCodes=${encodeURIComponent(code)}`
    );
    const d = resp.datas?.[0];
    if (!d) return null;
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

export const fetchDomesticIndices = async (): Promise<MarqueeItem[]> => {
  try {
    const data = await fetchJSON<NaverIndexPollingRaw>(`${BASE}/polling/domestic/index?itemCodes=KOSPI%2CKOSDAQ%2CKPI200`);
    return (data.datas || []).map(d => {
      const dir = d.compareToPreviousPrice?.code === '2' ? 1 : d.compareToPreviousPrice?.code === '5' ? -1 : 0;
      const c = num(d.compareToPreviousClosePriceRaw);
      const p = num(d.fluctuationsRatioRaw);
      return {
        code: d.itemCode ?? '', name: d.stockName || d.itemCode || '',
        currentValue: num(d.closePriceRaw),
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
      const c = num(d.compareToPreviousClosePriceRaw);
      const p = num(d.fluctuationsRatioRaw);
      return {
        code: d.reutersCode || d.symbolCode || '', name: d.indexName || d.reutersCode || '',
        currentValue: num(d.closePriceRaw),
        change: dir >= 0 ? c : -c, changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'index' as const,
      };
    });
  } catch (e) { logger.error('세계지수', (e as Error).message); return []; }
};
```

- [ ] **Step 3: tsc 확인** — Run: `npx tsc --noEmit` → Expected: 0 errors.

- [ ] **Step 4: 커밋**

```bash
git add src/shared/naver/stocks.ts src/shared/naver/indices.ts
git commit -m "$(cat <<'EOF'
refactor(naver): stocks/indices 도메인 분리

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: commodities.ts + fx.ts + investor.ts

**Files:**
- Create: `src/shared/naver/commodities.ts`
- Create: `src/shared/naver/fx.ts`
- Create: `src/shared/naver/investor.ts`

- [ ] **Step 1: `commodities.ts` 작성** (naver.ts 459–495. `parseCommodityItem`를 export로 승격)

```ts
import { MarqueeItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON, num, parseDir } from './client';
import type { NaverCommodityItemRaw } from './types';

type CommodityCategory = 'energy' | 'metals' | 'agricultural' | 'transport';
const COMMODITY_CATEGORIES: CommodityCategory[] = ['energy', 'metals', 'agricultural', 'transport'];

export const parseCommodityItem = (d: NaverCommodityItemRaw, type: MarqueeItem['type']): MarqueeItem => {
  const c = num(d.fluctuations);
  const p = num(d.fluctuationsRatio);
  const dir = d.fluctuationsType?.code === '2' ? 1 : d.fluctuationsType?.code === '5' ? -1 : 0;
  return {
    code: d.reutersCode || d.symbolCode || '',
    name: d.name || d.symbolCode || '',
    currentValue: num(d.closePrice),
    change: dir >= 0 ? c : -c,
    changePercent: dir >= 0 ? p : -p,
    changeDirection: parseDir(dir),
    type,
  };
};

export const fetchCommodities = async (): Promise<MarqueeItem[]> => {
  const out: MarqueeItem[] = [];
  const results = await Promise.all(
    COMMODITY_CATEGORIES.map(async (cat) => {
      try {
        const arr = await fetchJSON<NaverCommodityItemRaw[]>(`${BASE}/securityService/marketindex/${cat}`);
        return { cat, items: Array.isArray(arr) ? arr : [] };
      } catch (e) {
        logger.error(`원자재 ${cat}`, (e as Error).message);
        return { cat, items: [] as NaverCommodityItemRaw[] };
      }
    })
  );
  for (const { cat, items } of results) {
    for (const d of items) out.push(parseCommodityItem(d, cat));
  }
  return out;
};
```

- [ ] **Step 2: `fx.ts` 작성** (naver.ts 497–522)

```ts
import { MarqueeItem } from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { fetchJSON, num, parseDir } from './client';
import type { NaverFXRaw } from './types';

const FX_API = 'https://api.stock.naver.com/marketindex/exchange';
const FX_CODES = ['FX_USDKRW', 'FX_JPYKRW', 'FX_EURKRW', 'FX_CNYKRW'];
const FX_NAMES: Record<string, string> = { FX_USDKRW: 'USD/KRW', FX_JPYKRW: 'JPY/KRW', FX_EURKRW: 'EUR/KRW', FX_CNYKRW: 'CNY/KRW' };

export const fetchFXRates = async (): Promise<MarqueeItem[]> => {
  const results: MarqueeItem[] = [];
  for (const code of FX_CODES) {
    try {
      const d = await fetchJSON<NaverFXRaw>(`${FX_API}/${code}`);
      const info = d.exchangeInfo || d;
      const c = num(info.fluctuations);
      const p = num(info.fluctuationsRatio);
      const dir = info.fluctuationsType?.code === '2' ? 1 : info.fluctuationsType?.code === '5' ? -1 : 0;
      results.push({
        code, name: FX_NAMES[code] || info.name || code,
        currentValue: num(info.calcPrice) || num(info.closePrice),
        change: dir >= 0 ? c : -c,
        changePercent: dir >= 0 ? p : -p,
        changeDirection: parseDir(dir), type: 'fx',
      });
    } catch (e) { logger.warn(`환율 ${code}`, (e as Error).message); }
  }
  logger.info('환율', `${results.length}건 조회 (USD/KRW: ${results[0]?.currentValue || 'N/A'})`);
  return results;
};
```

- [ ] **Step 3: `investor.ts` 작성** (naver.ts 524–571. `toSigned`를 export로 승격)

```ts
import { logger } from '@/shared/utils/logger';
import { parseSignDirection, type Direction } from '@/shared/utils/format';
import { BASE, fetchJSON, num } from './client';
import type { NaverInvestorDataRaw } from './types';

export interface SignedValue {
  value: string;
  direction: Direction;
}
export interface InvestorData {
  dealTrend: { personal: SignedValue; foreign: SignedValue; institutional: SignedValue };
  programTrend: { arbitrage: SignedValue; nonArbitrage: SignedValue; total: SignedValue };
  upDown: { rise: number; steady: number; fall: number; upper: number; lower: number };
}

export const toSigned = (raw: string | undefined): SignedValue => {
  const value = raw || '0';
  return { value, direction: parseSignDirection(value) };
};

export const fetchInvestorData = async (market: 'KOSPI' | 'KOSDAQ'): Promise<InvestorData | null> => {
  try {
    const d = await fetchJSON<NaverInvestorDataRaw>(`${BASE}/securityFe/api/index/${market}/integration`);
    const deal = d.dealTrendInfo || {};
    const prog = d.programTrendInfo || {};
    const ud = d.upDownStockInfo || {};
    return {
      dealTrend: {
        personal: toSigned(deal.personalValue),
        foreign: toSigned(deal.foreignValue),
        institutional: toSigned(deal.institutionalValue),
      },
      programTrend: {
        arbitrage: toSigned(prog.indexDifferenceReal),
        nonArbitrage: toSigned(prog.indexBiDifferenceReal),
        total: toSigned(prog.indexTotalReal),
      },
      upDown: {
        // 네이버가 "1,402" 콤마 포함 — num()으로 안전 파싱
        rise: num(ud.riseCount),
        steady: num(ud.steadyCount),
        fall: num(ud.fallCount),
        upper: num(ud.upperCount),
        lower: num(ud.lowerCount),
      },
    };
  } catch (e) {
    logger.error('투자정보', `${market}: ${(e as Error).message}`);
    return null;
  }
};
```

- [ ] **Step 4: tsc 확인** — Run: `npx tsc --noEmit` → Expected: 0 errors.

- [ ] **Step 5: 커밋**

```bash
git add src/shared/naver/commodities.ts src/shared/naver/fx.ts src/shared/naver/investor.ts
git commit -m "$(cat <<'EOF'
refactor(naver): commodities/fx/investor 도메인 분리

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: ranking.ts + news.ts + research.ts

**Files:**
- Create: `src/shared/naver/ranking.ts`
- Create: `src/shared/naver/news.ts`
- Create: `src/shared/naver/research.ts`

- [ ] **Step 1: `ranking.ts` 작성** (naver.ts 573–671. `parseForeignDir`를 export로 승격. `fetchMarketBriefing`은 포함하지 않음 — news.ts로 감)

```ts
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON, num, parseDir } from './client';
import type {
  NaverPriceDirection,
  NaverForeignRankingRaw,
  NaverForeignRankingItemRaw,
  NaverDomesticRankingNewItem,
} from './types';

export interface RankingItem {
  rank: number;
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'flat';
  nation: string;
  reutersCode?: string;
  logoUrl?: string;
}

export const fetchDomesticRanking = async (type: 'volume' | 'value' | 'search'): Promise<RankingItem[]> => {
  const orderType = type === 'volume' ? 'quantTop' : type === 'value' ? 'priceTop' : 'searchTop';
  try {
    const data = await fetchJSON<NaverDomesticRankingNewItem[]>(
      `${BASE}/domestic/market/stock/default?tradeType=KRX&marketType=ALL&orderType=${orderType}&startIdx=0&pageSize=10`
    );
    const items = Array.isArray(data) ? data : [];
    return items.slice(0, 10).map((d, i) => {
      const ud = d.upDownGb;
      const dir = ud === '1' || ud === '2' ? 1 : ud === '4' || ud === '5' ? -1 : 0;
      const change = num(d.prevChangePrice);
      const changePct = num(d.prevChangeRate);
      return {
        rank: i + 1,
        code: d.itemcode || '',
        name: d.itemname || '',
        price: num(d.nowPrice),
        change: dir >= 0 ? change : -change,
        changePercent: dir >= 0 ? changePct : -changePct,
        changeDirection: parseDir(dir),
        nation: 'KR',
      };
    });
  } catch (e) {
    logger.error('국내 랭킹', (e as Error).message);
    return [];
  }
};

type ForeignNation = 'USA' | 'CHN' | 'JPN' | 'HKG' | 'VNM';
const NATION_MAP_REVERSE: Record<ForeignNation, string> = { USA: 'US', CHN: 'CN', JPN: 'JP', HKG: 'HK', VNM: 'VN' };

export const parseForeignDir = (val: NaverPriceDirection | string | undefined): number => {
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
        price: num(d.currentPrice || d.closePrice),
        change: num(d.compareToPreviousClosePrice),
        changePercent: num(d.fluctuationsRatio),
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
```

- [ ] **Step 2: `news.ts` 작성** (naver.ts 673–731(브리핑), 733–805(카테고리), 705–717+974–987(머니스토리). `parseNewsDatetime` export 승격, `buildNewsArticleUrl`은 내부 유지. `getNewsUrl`은 여기 두지 않음 — urls.ts로 감)

```ts
import { logger } from '@/shared/utils/logger';
import { BASE, MOBILE_BASE, fetchJSON } from './client';
import type {
  NaverMarketBriefingRaw,
  NaverMoneyStoryRaw,
  NewsCategoryResponseRaw,
} from './types';

export interface MarketBriefing {
  title: string;
  summary: string;
  detail: string;
  briefingDate: string;
  briefingHour: string;
  articles: { title: string; officeName: string; officeId: string; articleId: string }[];
}

export interface NewsRelatedItem {
  reutersCode: string;
  itemName: string;
  fluctuationsRatio: string;
  endUrl: string;
}

export interface NewsArticle {
  title: string;
  datetime: string;
  subcontent: string;
  thumbUrl?: string;
  officeId: string;
  articleId: string;
  officeHname: string;
  url: string;
  relatedItems?: NewsRelatedItem[];
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

export type NewsCategory = 'flashnews' | 'mainnews' | 'ranknews' | 'worldnews';

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

/** YYYYMMDDHHMMSS → ISO local (formatTime이 new Date()로 파싱 가능하도록) */
export const parseNewsDatetime = (dt?: string): string => {
  if (!dt || dt.length < 14) return dt || '';
  return `${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}T${dt.slice(8,10)}:${dt.slice(10,12)}:${dt.slice(12,14)}`;
};

/** 카테고리별 기사 상세 URL (해외뉴스는 별도 패턴) */
const buildNewsArticleUrl = (cat: NewsCategory, officeId: string, articleId: string): string => {
  if (cat === 'worldnews') {
    return `${MOBILE_BASE}/investment/news/worldnews/${officeId}/${articleId}`;
  }
  return `https://n.news.naver.com/article/${officeId}/${articleId}`;
};

export const fetchNewsByCategory = async (category: NewsCategory, pageSize: number = 50): Promise<NewsArticle[]> => {
  const path = category === 'worldnews'
    ? `${MOBILE_BASE}/front-api/news/worldnews?pageSize=${pageSize}&page=1`
    : `${MOBILE_BASE}/front-api/news/category?category=${category}&pageSize=${pageSize}&page=1`;
  try {
    const d = await fetchJSON<NewsCategoryResponseRaw>(path);
    return (d.result || []).map(a => {
      const officeId = a.officeId ?? '';
      const articleId = a.articleId ?? '';
      return {
        title: a.title ?? a.titleFull ?? '',
        datetime: parseNewsDatetime(a.datetime),
        subcontent: a.body ?? '',
        thumbUrl: a.hasImage === true && a.imageOriginLink ? a.imageOriginLink : undefined,
        officeId,
        articleId,
        officeHname: a.officeName ?? '',
        url: buildNewsArticleUrl(category, officeId, articleId),
        relatedItems: a.relatedItems && a.relatedItems.length > 0
          ? a.relatedItems.map(r => ({
              reutersCode: r.reutersCode ?? '',
              itemName: r.itemName ?? '',
              fluctuationsRatio: r.fluctuationsRatio ?? '0',
              endUrl: r.endUrl ?? '',
            }))
          : undefined,
      };
    });
  } catch (e) { logger.error(`뉴스 ${category}`, (e as Error).message); return []; }
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
```

- [ ] **Step 3: `research.ts` 작성** (naver.ts 807–858)

```ts
import { logger } from '@/shared/utils/logger';
import { MOBILE_BASE, fetchJSON } from './client';
import type { ResearchResponseRaw } from './types';

export type ResearchCategory = 'daily' | 'company' | 'industry' | 'invest' | 'economy' | 'debenture';

export interface ResearchItem {
  researchId: number;
  category: string;
  title: string;
  brokerName: string;
  writeDate: string;
  readCount: string;
  endUrl: string;
  itemCode?: string;
  itemName?: string;
}

export const fetchResearchByCategory = async (category: ResearchCategory, pageSize: number = 50): Promise<ResearchItem[]> => {
  try {
    const d = await fetchJSON<ResearchResponseRaw>(
      `${MOBILE_BASE}/front-api/research/list?category=${category}&pageSize=${pageSize}&page=1`
    );
    return (d.result || []).map(r => ({
      researchId: r.researchId ?? 0,
      category: r.researchCategory || r.category || '',
      title: r.title ?? '',
      brokerName: r.brokerName ?? '',
      writeDate: r.writeDate ?? '',
      readCount: r.readCount ?? '0',
      endUrl: r.endUrl ?? '',
      itemCode: r.itemCode,
      itemName: r.itemName,
    }));
  } catch (e) { logger.error(`리서치 ${category}`, (e as Error).message); return []; }
};
```

- [ ] **Step 4: tsc 확인** — Run: `npx tsc --noEmit` → Expected: 0 errors.

- [ ] **Step 5: 커밋**

```bash
git add src/shared/naver/ranking.ts src/shared/naver/news.ts src/shared/naver/research.ts
git commit -m "$(cat <<'EOF'
refactor(naver): ranking/news/research 도메인 분리

fetchMarketBriefing은 MarketBriefing 타입 응집을 위해 news.ts에 배치.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: sectors.ts + calendar.ts + interest.ts + urls.ts

**Files:**
- Create: `src/shared/naver/sectors.ts`
- Create: `src/shared/naver/calendar.ts`
- Create: `src/shared/naver/interest.ts`
- Create: `src/shared/naver/urls.ts`

- [ ] **Step 1: `sectors.ts` 작성** (naver.ts 860–972. `dirFromFluctuationsType` export 승격)

```ts
import { logger } from '@/shared/utils/logger';
import { MOBILE_BASE, fetchJSON, num } from './client';
import type { SectorOverviewRaw } from './types';

export type SectorNation = 'domestic' | 'USA';

export interface SectorStock {
  name: string;
  code: string;
  reutersCode?: string;
  currentPrice: number;
  currency: string;
  changePercent: number;
  changeAbs: string;
  direction: 'up' | 'down' | 'flat';
  nation: string;
}

export interface Sector {
  code: string;
  name: string;
  changeRate: number;
  marketCap: number;
  risingCount: number;
  unchangedCount: number;
  fallingCount: number;
  topStocks: SectorStock[];
}

export interface SectorOverview {
  totalRisingCount: number;
  totalUnchangedCount: number;
  totalFallingCount: number;
  sectors: Sector[];
}

export const dirFromFluctuationsType = (t?: string): 'up' | 'down' | 'flat' =>
  t === 'RISING' ? 'up' : t === 'FALLING' ? 'down' : 'flat';

export const fetchSectors = async (nation: SectorNation): Promise<SectorOverview | null> => {
  const extra = nation === 'domestic' ? '&sectorType=upjong' : '';
  try {
    const d = await fetchJSON<SectorOverviewRaw>(
      `${MOBILE_BASE}/front-api/stock/sectors/all/price?businessDayCategory=daily&nationType=${nation}&sectorSortType=MARKET_VALUE${extra}&page=1&pageSize=20`
    );
    const r = d.result;
    if (!r) return null;
    return {
      totalRisingCount: r.totalRisingCount ?? 0,
      totalUnchangedCount: r.totalUnChangedCount ?? 0,
      totalFallingCount: r.totalFallingCount ?? 0,
      sectors: (r.sectors || []).map(s => ({
        code: s.sectorCode ?? '',
        name: s.sectorName ?? '',
        changeRate: s.changeRate ?? 0,
        marketCap: s.totalMarketCap ?? 0,
        risingCount: s.risingCount ?? 0,
        unchangedCount: s.unChangedCount ?? 0,
        fallingCount: s.fallingCount ?? 0,
        topStocks: (s.items || []).map(it => {
          const dir = dirFromFluctuationsType(it.fluctuationsType);
          const pct = num(it.fluctuationsRatio);
          return {
            name: it.name ?? '',
            code: it.itemCode || it.id || '',
            reutersCode: it.reutersCode,
            currentPrice: it.currentPrice ?? 0,
            currency: it.currencyType ?? 'KRW',
            changePercent: dir === 'down' ? -pct : pct,
            changeAbs: it.fluctuations ?? '0',
            direction: dir,
            nation: it.nationType === 'USA' ? 'US' : nation === 'domestic' ? 'KR' : 'US',
          };
        }),
      })),
    };
  } catch (e) {
    logger.error(`섹터 ${nation}`, (e as Error).message);
    return null;
  }
};
```

- [ ] **Step 2: `calendar.ts` 작성** (naver.ts 1021–1074. `parseIndicator` export 승격, `fmtTime`/`NATION_CODE_MAP` 내부 유지)

```ts
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON } from './client';
import type { NaverEconomicCalendarRaw, NaverEconomicIndicatorRaw } from './types';

export interface EconomicIndicator {
  name: string;
  nation: 'KR' | 'US' | string;
  nationName: string;
  releaseDate: string;
  releaseTime: string;
  isReleased: boolean;
  actualValue: number;
  previousValue: number;
  changeValue: number;
  importance: number;
  unit: string;
  period: string;
}

const NATION_CODE_MAP: Record<string, string> = { KOR: 'KR', USA: 'US' };

/** HHmmss → HH:mm */
const fmtTime = (raw: string): string => {
  if (!raw) return '';
  const s = raw.replace(/[^0-9]/g, '');
  if (s.length >= 4) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return raw;
};

export const parseIndicator = (d: NaverEconomicIndicatorRaw): EconomicIndicator => ({
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
```

- [ ] **Step 3: `interest.ts` 작성** (naver.ts 1076–1162. `parseInterestRate` export 승격)

```ts
import { logger } from '@/shared/utils/logger';
import { BASE, fetchJSON } from './client';
import type { InterestRateRaw } from './types';

export interface InterestRateItem {
  name: string;
  code?: string;
  rate: string;
  change: string;
  changeRatio: string;
  direction: 'up' | 'down' | 'flat';
  date: string;
  nextReleaseDate?: string;
  nation?: string;
  nationName?: string;
  description?: string;
}

export const parseInterestRate = (d: InterestRateRaw): InterestRateItem => {
  const dirCode = d.fluctuationsType?.code;
  const dir = dirCode === '2' || dirCode === '1' ? 'up' : dirCode === '5' || dirCode === '4' ? 'down' : 'flat';
  const dateStr = d.localTradedAt ? d.localTradedAt.split('T')[0] : '';
  return {
    name: d.name || '',
    code: d.itemCode || d.code || d.reutersCode || d.symbolCode || undefined,
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
    const data = await fetchJSON<InterestRateRaw[]>(`${BASE}/securityService/marketindex/majors/standardInterest`);
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('기준금리', (e as Error).message);
    return [];
  }
};

export const fetchDomesticInterest = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(`${BASE}/securityService/marketindex/majors/domesticInterest`);
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('국내금리', (e as Error).message);
    return [];
  }
};

export const fetchBondYield = async (): Promise<InterestRateItem[]> => {
  try {
    const data = await fetchJSON<InterestRateRaw[]>(`${BASE}/securityService/marketindex/majors/bond`);
    return (data || []).map(parseInterestRate);
  } catch (e) {
    logger.error('국채수익률', (e as Error).message);
    return [];
  }
};
```

- [ ] **Step 4: `urls.ts` 작성** (naver.ts 989–1019. `getNewsUrl` + `getNaverStockUrl`)

```ts
import { StockSymbol, inferCategory } from '@/shared/types';

export const getNewsUrl = (officeId: string, articleId: string) =>
  `https://n.news.naver.com/article/${officeId}/${articleId}`;

export const getNaverStockUrl = (symbol: Pick<StockSymbol, 'code' | 'nation' | 'reutersCode'> & Partial<Pick<StockSymbol, 'market' | 'category'>>) => {
  const cat = inferCategory(symbol as StockSymbol);

  // 지수/선물: code-pattern 기반 라우팅 (nation 기반은 자동완성 오분류로 깨짐)
  if (cat === 'index' || cat === 'futures') {
    const c = (symbol.code || '').toUpperCase();
    const rc = (symbol.reutersCode || '').toUpperCase();
    const ref = symbol.reutersCode || symbol.code;
    if (c.startsWith('.') || rc.startsWith('.')) {
      return `https://m.stock.naver.com/worldstock/index/${ref}`;
    }
    if (/CV\d+$/i.test(c) || /CV\d+$/i.test(rc)) {
      return `https://m.stock.naver.com/worldstock/futures/${ref}/price`;
    }
    return `https://m.stock.naver.com/domestic/index/${symbol.code}`;
  }

  return symbol.nation === 'KR'
    ? `https://m.stock.naver.com/domestic/stock/${symbol.code}/total`
    : `https://m.stock.naver.com/worldstock/stock/${symbol.reutersCode || symbol.code}/total`;
};
```

- [ ] **Step 5: tsc 확인** — Run: `npx tsc --noEmit` → Expected: 0 errors.

- [ ] **Step 6: 커밋**

```bash
git add src/shared/naver/sectors.ts src/shared/naver/calendar.ts src/shared/naver/interest.ts src/shared/naver/urls.ts
git commit -m "$(cat <<'EOF'
refactor(naver): sectors/calendar/interest/urls 도메인 분리

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: barrel 생성 + 기존 파일 삭제 (전환점)

이 단계에서 `@/shared/naver`가 `naver.ts` → `naver/index.ts`로 전환된다. 소비자 코드는 불변.

**Files:**
- Create: `src/shared/naver/index.ts`
- Delete: `src/shared/naver.ts`
- Delete: `src/shared/naver-types.ts`

- [ ] **Step 1: `index.ts` barrel 작성**

```ts
// naver.ts 분할 barrel — 기존 public API를 그대로 노출.
// (client의 BASE/fetchJSON/num/parseDir, polling의 parsePollingData 등 코어도
//  함께 노출되지만 추가 노출일 뿐 동작/소비자에 영향 없음.)
export * from './client';
export * from './types';
export * from './polling';
export * from './stocks';
export * from './indices';
export * from './commodities';
export * from './fx';
export * from './investor';
export * from './ranking';
export * from './news';
export * from './research';
export * from './sectors';
export * from './calendar';
export * from './interest';
export * from './urls';
```

- [ ] **Step 2: 기존 파일 삭제**

```bash
git rm src/shared/naver.ts src/shared/naver-types.ts
```

- [ ] **Step 3: tsc 전체 검증** (소비자 22곳이 barrel로 정상 해석되는지)

Run: `npx tsc --noEmit`
Expected: 0 errors. 만약 "Cannot find module '@/shared/naver-types'" 류 에러가 나면 잔존 직접 import가 있다는 뜻 — `grep -rn "naver-types" src` 로 찾아 `@/shared/naver`로 교체. (사전 조사 결과 naver.ts 외 직접 import 없음.)

- [ ] **Step 4: eslint 검증**

Run: `npx eslint src/shared/naver`
Expected: 0 warnings/errors. (디자인 토큰 룰은 이 폴더에 해당 없음 — 색/간격 미사용.)

- [ ] **Step 5: 기존 테스트 회귀 확인**

Run: `npm run test:run`
Expected: 모든 기존 테스트 green (store 등). naver 관련 동작 불변.

- [ ] **Step 6: 커밋**

```bash
git add src/shared/naver/index.ts
git commit -m "$(cat <<'EOF'
refactor(naver): barrel 전환 + 기존 naver.ts/naver-types.ts 제거

@/shared/naver가 naver/index.ts로 해석. 24개 public export 보존,
소비자 22곳 import 불변. tsc/eslint/기존 테스트 green.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 테스트 — num + parsePollingData

> **참고:** 대상 함수가 이미 존재하므로 이 테스트들은 **characterization test**(기존 동작 고정)다. 처음 실행 시 PASS가 정상이다. 만약 FAIL이면 Task 1–6의 이동 과정에서 로직이 바뀐 것이므로 원본(git에서 `naver.ts`) 대비 조사할 것.

**Files:**
- Create: `src/shared/naver/__tests__/num.test.ts`
- Create: `src/shared/naver/__tests__/polling.test.ts`

- [ ] **Step 1: `num.test.ts` 작성** (콤마 잘림 사고 고정)

```ts
import { describe, it, expect } from 'vitest';
import { num } from '../client';

describe('num', () => {
  it('콤마를 제거하고 숫자로 변환한다', () => {
    expect(num('1,402')).toBe(1402);
    expect(num('15,219,364')).toBe(15219364);
  });
  it('소수점을 보존한다', () => {
    expect(num('1,234.5')).toBe(1234.5);
  });
  it('음수 부호를 보존한다', () => {
    expect(num('-1,200')).toBe(-1200);
  });
  it('undefined/null/빈 문자열/비숫자는 0', () => {
    expect(num(undefined)).toBe(0);
    expect(num(null)).toBe(0);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
  });
});
```

- [ ] **Step 2: `num.test.ts` 실행**

Run: `npx vitest run src/shared/naver/__tests__/num.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: `polling.test.ts` 작성** (가격/부호/시총/NXT/지수 nation 분기 고정)

```ts
import { describe, it, expect } from 'vitest';
import { parsePollingData } from '../polling';
import type { NaverPollingData } from '../types';

describe('parsePollingData', () => {
  it('국내 주식(KRX OPEN, 상승 code 2) — 가격/부호/시총 파싱', () => {
    const d: NaverPollingData = {
      itemCode: '005930', stockName: '삼성전자',
      closePriceRaw: '71,200', compareToPreviousClosePriceRaw: '1,200',
      fluctuationsRatioRaw: '1.71', compareToPreviousPrice: { code: '2' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
      stockExchangeType: { nationCode: 'KOR', name: 'KOSPI', nameKor: '유가증권시장' },
      currencyType: { code: 'KRW' },
      marketValueFullRaw: '425000000000000',
      accumulatedTradingVolume: '15,219,364',
    };
    const r = parsePollingData(d, '005930', 'stock');
    expect(r.currentPrice).toBe(71200);
    expect(r.change).toBe(1200);
    expect(r.changePercent).toBeCloseTo(1.71);
    expect(r.changeDirection).toBe('up');
    expect(r.previousClose).toBe(70000);
    expect(r.nation).toBe('KR');
    expect(r.currency).toBe('KRW');
    expect(r.marketStatus).toBe('OPEN');
    expect(r.marketCapRaw).toBe(425000000000000);
    expect(r.marketCap).toBe('425.0조');
    expect(r.volume).toBe('15,219,364');
  });

  it('하락(code 5)은 change/changePercent를 음수로', () => {
    const d: NaverPollingData = {
      itemCode: '000660', stockName: 'SK하이닉스',
      closePriceRaw: '180,000', compareToPreviousClosePriceRaw: '2,000',
      fluctuationsRatioRaw: '1.10', compareToPreviousPrice: { code: '5' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
      stockExchangeType: { nationCode: 'KOR' },
    };
    const r = parsePollingData(d, '000660', 'stock');
    expect(r.change).toBe(-2000);
    expect(r.changePercent).toBeCloseTo(-1.10);
    expect(r.changeDirection).toBe('down');
  });

  it('NXT/시간외(overMarketStatus OPEN)면 overPrice를 우선 사용', () => {
    const d: NaverPollingData = {
      itemCode: '000660', stockName: 'SK하이닉스',
      closePriceRaw: '180,000', marketStatus: 'CLOSE',
      compareToPreviousPrice: { code: '2' },
      overMarketPriceInfo: {
        overMarketStatus: 'OPEN', overPrice: '182,500',
        compareToPreviousClosePrice: '2,500', fluctuationsRatio: '1.39',
        compareToPreviousPrice: { code: '2' }, localTradedAt: '2026-06-02T17:00:00',
      },
    };
    const r = parsePollingData(d, '000660', 'stock');
    expect(r.currentPrice).toBe(182500);
    expect(r.change).toBe(2500);
    expect(r.changePercent).toBeCloseTo(1.39);
    expect(r.marketStatus).toBe('OPEN');
    expect(r.updatedAt).toBe('2026-06-02T17:00:00');
  });

  it('지수(index)는 nationCode 누락 시 US로 오분류하지 않고 빈 문자열', () => {
    const d: NaverPollingData = {
      itemCode: 'KOSPI', stockName: '코스피',
      closePriceRaw: '2,650.5', compareToPreviousClosePriceRaw: '10.2',
      fluctuationsRatioRaw: '0.39', compareToPreviousPrice: { code: '2' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
    };
    const r = parsePollingData(d, 'KOSPI', 'index');
    expect(r.nation).toBe('');
    expect(r.market).toBe('지수');
    expect(r.currency).toBe('');
    expect(r.marketCap).toBeUndefined();
    expect(r.isTradingHalt).toBe(false);
  });

  it('보합(code 3, pct 0)은 flat', () => {
    const d: NaverPollingData = {
      itemCode: '005930', stockName: '삼성전자',
      closePriceRaw: '71,000', compareToPreviousClosePriceRaw: '0',
      fluctuationsRatioRaw: '0', compareToPreviousPrice: { code: '3' },
      marketStatus: 'OPEN', localTradedAt: '2026-06-02T15:30:00',
      stockExchangeType: { nationCode: 'KOR' },
    };
    const r = parsePollingData(d, '005930', 'stock');
    expect(r.change).toBe(0);
    expect(r.changeDirection).toBe('flat');
  });
});
```

- [ ] **Step 4: `polling.test.ts` 실행**

Run: `npx vitest run src/shared/naver/__tests__/polling.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/shared/naver/__tests__/num.test.ts src/shared/naver/__tests__/polling.test.ts
git commit -m "$(cat <<'EOF'
test(naver): num/parsePollingData 정합성 테스트

콤마 잘림, 부호 코드(2/5/3), NXT overPrice 우선, 지수 nation 오분류 방지 고정.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 테스트 — 나머지 정합성 transform

**Files:**
- Create: `src/shared/naver/__tests__/transforms.test.ts`

- [ ] **Step 1: `transforms.test.ts` 작성** (interest/foreignDir/commodity/indicator/sectorDir/newsDatetime/toSigned)

```ts
import { describe, it, expect } from 'vitest';
import { parseInterestRate } from '../interest';
import { parseForeignDir } from '../ranking';
import { parseCommodityItem } from '../commodities';
import { parseIndicator } from '../calendar';
import { dirFromFluctuationsType } from '../sectors';
import { parseNewsDatetime } from '../news';
import { toSigned } from '../investor';
import type { InterestRateRaw, NaverCommodityItemRaw, NaverEconomicIndicatorRaw } from '../types';

describe('parseInterestRate', () => {
  it('부호 코드 매핑(1/2=up, 4/5=down, 3=flat)과 날짜 분리', () => {
    const base: InterestRateRaw = {
      name: '미국 기준금리', itemCode: 'US', closePrice: '4.50',
      fluctuations: '0.00', fluctuationsRatio: '-',
      localTradedAt: '2026-06-02T08:00:00', nationType: 'USA', nationName: '미국',
    };
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '2' } }).direction).toBe('up');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '1' } }).direction).toBe('up');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '5' } }).direction).toBe('down');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '4' } }).direction).toBe('down');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '3' } }).direction).toBe('flat');
    const r = parseInterestRate({ ...base, fluctuationsType: { code: '3' } });
    expect(r.rate).toBe('4.50');
    expect(r.date).toBe('2026-06-02');
    expect(r.code).toBe('US');
    expect(r.nation).toBe('USA');
  });
});

describe('parseForeignDir', () => {
  it('문자열 상태 매핑', () => {
    expect(parseForeignDir('RISING')).toBe(1);
    expect(parseForeignDir('UPPER_LIMIT')).toBe(1);
    expect(parseForeignDir('FALLING')).toBe(-1);
    expect(parseForeignDir('LOWER_LIMIT')).toBe(-1);
    expect(parseForeignDir('UNKNOWN')).toBe(0);
  });
  it('코드 객체 매핑과 undefined', () => {
    expect(parseForeignDir({ code: '2' })).toBe(1);
    expect(parseForeignDir({ code: '1' })).toBe(1);
    expect(parseForeignDir({ code: '5' })).toBe(-1);
    expect(parseForeignDir({ code: '4' })).toBe(-1);
    expect(parseForeignDir({ code: '3' })).toBe(0);
    expect(parseForeignDir(undefined)).toBe(0);
  });
});

describe('parseCommodityItem', () => {
  it('상승/하락 부호 반영', () => {
    const base: NaverCommodityItemRaw = {
      reutersCode: 'CLc1', name: 'WTI', closePrice: '78.50',
      fluctuations: '1.20', fluctuationsRatio: '1.55',
    };
    const up = parseCommodityItem({ ...base, fluctuationsType: { code: '2' } }, 'energy');
    expect(up.currentValue).toBe(78.5);
    expect(up.change).toBe(1.2);
    expect(up.changePercent).toBeCloseTo(1.55);
    expect(up.changeDirection).toBe('up');
    expect(up.code).toBe('CLc1');
    const down = parseCommodityItem({ ...base, fluctuationsType: { code: '5' } }, 'energy');
    expect(down.change).toBe(-1.2);
    expect(down.changePercent).toBeCloseTo(-1.55);
    expect(down.changeDirection).toBe('down');
  });
});

describe('parseIndicator', () => {
  it('국가코드/시간 포맷/발표여부 매핑', () => {
    const d: NaverEconomicIndicatorRaw = {
      name: 'CPI', nationType: 'USA', nationKoreanName: '미국',
      releaseDate: '20260610', releaseTime: '213000', isRelease: true,
      actualValue: 3.2, previousValue: 3.1, changeValue: 0.1,
      importance: 3, indicatorUnit: '%', period: 'May 2026',
    };
    const r = parseIndicator(d);
    expect(r.nation).toBe('US');
    expect(r.nationName).toBe('미국');
    expect(r.releaseTime).toBe('21:30');
    expect(r.isReleased).toBe(true);
    expect(r.importance).toBe(3);
    expect(r.unit).toBe('%');
  });
  it('releaseTime 빈 값은 빈 문자열', () => {
    const r = parseIndicator({ name: 'X', nationType: 'KOR', releaseTime: '' });
    expect(r.nation).toBe('KR');
    expect(r.releaseTime).toBe('');
    expect(r.importance).toBe(1);
  });
});

describe('dirFromFluctuationsType', () => {
  it('RISING/FALLING/그외 매핑', () => {
    expect(dirFromFluctuationsType('RISING')).toBe('up');
    expect(dirFromFluctuationsType('FALLING')).toBe('down');
    expect(dirFromFluctuationsType('UNCHANGED')).toBe('flat');
    expect(dirFromFluctuationsType(undefined)).toBe('flat');
  });
});

describe('parseNewsDatetime', () => {
  it('YYYYMMDDHHMMSS → ISO local', () => {
    expect(parseNewsDatetime('20260602153045')).toBe('2026-06-02T15:30:45');
  });
  it('14자 미만/undefined는 원본 또는 빈 문자열', () => {
    expect(parseNewsDatetime('123')).toBe('123');
    expect(parseNewsDatetime(undefined)).toBe('');
  });
});

describe('toSigned', () => {
  it('값을 그대로 보존하고 방향을 부호로 판단', () => {
    expect(toSigned('+12,345').value).toBe('+12,345');
    expect(toSigned('+12,345').direction).toBe('up');
    expect(toSigned('-9,800').direction).toBe('down');
    expect(toSigned('0').direction).toBe('flat');
  });
  it('undefined는 "0"으로 폴백', () => {
    expect(toSigned(undefined).value).toBe('0');
    expect(toSigned(undefined).direction).toBe('flat');
  });
});
```

> **주의(toSigned):** `direction` 단언은 `parseSignDirection`(`@/shared/utils/format`)이 `+`→up, `-`→down, 그 외→flat을 반환한다는 전제다. 만약 PASS하지 않으면 `parseSignDirection` 실제 동작을 확인하고 단언을 실제 반환값에 맞춰 수정한다(이 함수는 본 리팩터 범위 밖, 동작 변경 금지).

- [ ] **Step 2: 실행**

Run: `npx vitest run src/shared/naver/__tests__/transforms.test.ts`
Expected: PASS. (toSigned direction이 어긋나면 위 주의대로 단언 조정 후 재실행.)

- [ ] **Step 3: 전체 검증 게이트**

Run: `npx tsc --noEmit && npx eslint src/shared/naver && npm run test:run`
Expected: tsc 0 errors / eslint 0 warnings / 전체 테스트 green.

- [ ] **Step 4: 커밋**

```bash
git add src/shared/naver/__tests__/transforms.test.ts
git commit -m "$(cat <<'EOF'
test(naver): interest/ranking/commodity/calendar/sector/news/investor transform 테스트

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 완료 기준 (전체 재확인)

- [ ] `src/shared/naver/`: client/types/polling 코어 + 12개 도메인 파일 + index barrel
- [ ] `src/shared/naver.ts`, `src/shared/naver-types.ts` 제거됨
- [ ] 24개 public export barrel 보존, 소비자 22곳 import 불변
- [ ] `npx tsc --noEmit` 0 에러
- [ ] `npx eslint src/shared/naver` 0 경고
- [ ] 정합성 핵심 transform 테스트 green (num, parsePollingData, parseInterestRate, parseForeignDir, parseCommodityItem, parseIndicator, dirFromFluctuationsType, parseNewsDatetime, toSigned)
- [ ] `npm run test:run` 전체 green (기존 테스트 회귀 없음)
