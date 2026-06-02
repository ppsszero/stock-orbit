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
