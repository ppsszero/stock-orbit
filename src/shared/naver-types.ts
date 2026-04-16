/**
 * 네이버 증권 API 원시 응답 타입
 *
 * 공식 명세 없음 — 실제 응답 필드 접근 패턴에서 역추론한 타입.
 * 파싱 로직이 변경되면 이 파일도 함께 업데이트할 것.
 *
 * 규칙:
 * - API가 항상 보장하는 필드 → 필수(non-optional)
 * - 없을 수 있거나 응답 변형에 따라 다른 필드 → optional
 * - 문자열 숫자(","포함) → string, 정수 코드 → string literal union
 */

// ── 공통 ───────────────────────────────────────────────────────────────

/** 등락 방향 코드 ('2'=상승/상한가, '1'=상한가, '5'=하락/하한가, '4'=하한가, '3'=보합) */
export type NaverUpDownCode = '1' | '2' | '3' | '4' | '5';

/** compareToPreviousPrice 필드 공통 형태 */
export interface NaverPriceDirection {
  code: NaverUpDownCode;
  name?: string;
}

// ── 폴링: 국내·세계 지수 ─────────────────────────────────────────────────

export interface NaverIndexItemRaw {
  /** 국내 지수 코드 */
  itemCode?: string;
  /** 세계 지수 reuters 코드 */
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

// ── 원자재 ───────────────────────────────────────────────────────────────

export interface NaverCommodityItemRaw {
  closePrice?: string;
  fluctuations?: string;
  fluctuationsRatio?: string;
  fluctuationsType?: { code: NaverUpDownCode };
}

/**
 * 실제 응답이 `{ datas: [...] }` 또는 item 직접 반환 두 가지로 옴.
 * `extends NaverCommodityItemRaw` 로 두 경우를 단일 타입으로 처리.
 */
export interface NaverCommodityPollingRaw extends NaverCommodityItemRaw {
  datas?: NaverCommodityItemRaw[];
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

/** 최상위 응답이 exchangeInfo 래퍼를 가질 수도, 직접 info일 수도 있음 */
export interface NaverFXRaw extends NaverFXInfoRaw {
  exchangeInfo?: NaverFXInfoRaw;
}

// ── 국내 랭킹 ────────────────────────────────────────────────────────────

export interface NaverDomesticRankingItemRaw {
  itemCode?: string;
  symbolCode?: string;
  stockName?: string;
  closePriceRaw?: string;
  closePrice?: string;
  compareToPreviousClosePriceRaw?: string;
  fluctuationsRatioRaw?: string;
  fluctuationsRatio?: string;
  accumulatedTradingVolumeRaw?: string;
  accumulatedTradingValueRaw?: string;
  compareToPreviousPrice?: NaverPriceDirection;
}

export interface NaverDomesticRankingRaw {
  datas?: NaverDomesticRankingItemRaw[];
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

/** API가 배열 또는 래퍼 객체 두 형태로 응답 */
export type NaverForeignRankingRaw =
  | NaverForeignRankingItemRaw[]
  | { stocks?: NaverForeignRankingItemRaw[]; datas?: NaverForeignRankingItemRaw[] };

// ── 지수 투자정보 ────────────────────────────────────────────────────────

export interface NaverInvestorDataRaw {
  dealTrendInfo?: {
    personalValue?: string;
    foreignValue?: string;
    institutionalValue?: string;
  };
  programTrendInfo?: {
    indexDifferenceReal?: string;
    indexBiDifferenceReal?: string;
    indexTotalReal?: string;
  };
  upDownStockInfo?: {
    riseCount?: string;
    steadyCount?: string;
    fallCount?: string;
    upperCount?: string;
    lowerCount?: string;
  };
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

export interface NaverNewsArticleRaw {
  title?: string;
  datetime?: string;
  subcontent?: string;
  thumbUrl?: string;
  officeId?: string;
  articleId?: string;
  officeHname?: string;
}

export interface NaverNewsListRaw {
  articles?: NaverNewsArticleRaw[];
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

// ── 경제 캘린더 ──────────────────────────────────────────────────────────

export interface NaverEconomicIndicatorRaw {
  dataType?: string;
  reutersCode?: string;
  nationType?: string;           // 'USA' | 'KOR'
  nationKoreanName?: string;     // '미국' | '한국'
  name?: string;                 // 지표 발표명
  releaseDate?: string;          // 'YYYYMMDD'
  releaseTime?: string;          // 'HHmmss'
  importance?: number;           // 4=매우높음, 3=높음, 2=보통, 1=낮음
  period?: string;               // 'Q4 2025' 등
  periodDate?: string;
  actualValue?: number;          // 발표값 (미발표 시 0)
  changeValue?: number;          // 이전 대비 변동
  previousValue?: number;        // 이전 발표값
  correctValue?: number;
  isRelease?: boolean;           // 발표 여부
  searchQuery?: string;
  category?: string;
  indicatorUnit?: string;        // '%', 'K' 등
  unitScale?: string | null;
}

export interface NaverEconomicCalendarRaw {
  pageSize?: number;
  page?: number;
  totalCount?: number;
  indicators?: NaverEconomicIndicatorRaw[];
}
