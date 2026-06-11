// === Preset & Settings ===
export interface Preset {
  id: string;
  name: string;
  symbols: StockSymbol[];
}

export interface StockSymbol {
  code: string;       // 종목번호 (005930) 또는 Reuters code (AAPL.O)
  name: string;       // 종목명 (삼성전자)
  nameEn?: string;    // 영문명
  market: string;     // KOSPI, KOSDAQ, NASDAQ, NYSE 등 (지수/선물은 빈 문자열 가능)
  nation: string;     // KR, US, JP, CN 등
  reutersCode?: string; // 해외주식용 Reuters code
  /** 심볼 분류 — 기본값 'stock' (일반 주식). 지수/선물은 별도 API 호출 필요 */
  category?: 'stock' | 'index' | 'futures';
}

/** category가 없는 과거 저장 심볼을 위해 market/code 필드에서 추론 */
export const inferCategory = (sym: StockSymbol): 'stock' | 'index' | 'futures' => {
  if (sym.category) return sym.category;
  const m = (sym.market || '').toUpperCase();
  const c = (sym.code || '').toUpperCase();
  // 선물: typeCode 또는 코드에서 FUT/FUTURE 감지
  if (m.includes('FUT') || c === 'FUT' || /CV\d+$/.test(c)) return 'futures';
  // 지수: typeCode 또는 알려진 지수 코드
  if (m.includes('INDEX') || c === 'KOSPI' || c === 'KOSDAQ' || c === 'KPI200' || c.startsWith('.')) return 'index';
  return 'stock';
};

export type SortKey = 'custom' | 'name' | 'change';
export type SortDir = 'asc' | 'desc';

/**
 * 시장 세션 — 시간/DST 계산 없이 API가 직접 주는 세션 상태.
 * REGULAR: 정규장(네이버 marketStatus OPEN) / PRE·AFTER: 네이버 over.tradingSessionType
 * OVERNIGHT: US 데이마켓(야후 WS marketHours=4, 네이버 미제공) / CLOSED: 장마감
 * live = CLOSED 외 전부.
 */
export type MarketSession = 'REGULAR' | 'PRE' | 'AFTER' | 'OVERNIGHT' | 'CLOSED';

export interface AppSettings {
  theme: 'light' | 'dark';
  opacity: number;
  alwaysOnTop: boolean;
  refreshIntervalDomestic: number; // seconds — 국내 주식/지수/선물
  refreshIntervalOverseas: number; // seconds — 해외 주식/지수/선물/원자재/환율/마퀴
  tickerSpeed: number;     // px per second
  /** 증시현황(섹터 트리맵) 표시 업종 수 — nation별 (API 상한: 국내 31 / 해외 33) */
  sectorCountDomestic: number;
  sectorCountOverseas: number;
  currencyMode: 'KRW' | 'USD';
  resolution: { width: number; height: number };
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  autoCleanLogs: boolean;
  autoLaunch: boolean;
  /**
   * 자동 업데이트 알림 표시 여부. 끄면 백그라운드 다운로드는 계속되지만 모달이 안 뜸.
   * 트레이의 "업데이트 확인"은 이 설정과 무관하게 항상 표시 (사용자의 명시적 액션).
   */
  autoUpdateNotify: boolean;
  viewMode: 'list' | 'grid' | 'tile';
  sortKey: SortKey;
  sortDir: SortDir;
  screenshot: ScreenshotSettings;
}

export interface NoticeItem {
  version: string;
  date: string;
  content: string;
}

export interface ScreenshotSettings {
  shortcut: string;                         // 'F9', 'Ctrl+Shift+S' 등
  mode: 'clipboard' | 'file';              // 클립보드 복사 or 파일 저장
  savePath: string;                         // 파일 저장 경로
}

// === Naver API Response Types (실제 응답 기반) ===
export interface NaverAutoCompleteResponse {
  result: {
    query: string;
    items: NaverAutoCompleteItem[];
  };
}

export interface NaverAutoCompleteItem {
  code: string;
  name: string;
  typeCode?: string;   // KOSPI, KOSDAQ
  typeName?: string;   // 코스피, 코스닥
  url?: string;
  reutersCode?: string;
  nationCode?: string; // KOR, USA
  nationName?: string;
  category?: string;   // stock, index
}

// === Stock Price Data ===
export interface StockPrice {
  code: string;
  name: string;
  nation: string;
  market: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'flat';
  currency: string;
  marketStatus: MarketSession;
  updatedAt: string;
  reutersCode?: string;
  // 보조 데이터
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: string;
  tradingValue?: string;
  marketCap?: string;
  marketCapRaw?: number; // 원본 시가총액 (treemap 크기 계산용)
  exchange?: string; // 거래소명 (KOSPI, NASDAQ 등)
  isTradingHalt?: boolean; // 거래정지 여부
  /** 네이버 시간외(pre/post = overMarketPriceInfo) 제공 여부. US 데이마켓(야후 오버나잇) 지원 판별에 사용 */
  hasExtendedHours?: boolean;
}

// === Marquee Index/FX Data ===
export interface MarqueeItem {
  code: string;
  name: string;
  currentValue: number;
  change: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'flat';
  type: 'index' | 'fx' | 'commodity' | 'metals' | 'energy' | 'agricultural' | 'transport';
}

/** 야후 실시간 스트리머(WS) 디코드 결과 — 해외 연장가/오버나잇. marketHours: 0=장전 1=정규 2=장후 4=오버나잇 */
export interface YahooStreamQuote {
  price: number;
  change: number;
  changePercent: number;
  marketHours: number;
}

// === Electron API ===
export interface ElectronAPI {
  close: () => void;
  reloadWebview: () => void;
  setAlwaysOnTop: (value: boolean) => void;
  setAutoLaunch: (value: boolean) => void;
  setOpacity: (value: number) => void;
  setSize: (size: { width: number; height: number }) => void;
  getWindowSize: () => Promise<{ width: number; height: number }>;
  onAlwaysOnTopChanged: (callback: (value: boolean) => void) => void;
  onWindowResized: (callback: (size: { width: number; height: number }) => void) => void;
  naverFetch: (url: string) => Promise<{ data?: unknown; error?: string }>;
  /** 야후 실시간 연장가/오버나잇 — 티커 구독 + 최신 스냅샷 (WS+protobuf는 메인이 관리). meta: 가시성용 연결상태 */
  yahooQuotes: (tickers: string[]) => Promise<{
    quotes?: Record<string, YahooStreamQuote>;
    meta?: { connected: boolean; tracked: number; fresh: number };
    error?: string;
  }>;
  setZoom: (factor: number) => void;
  getDefaultScreenshotPath: () => Promise<string>;
  captureWindow: () => Promise<string>;                    // base64 이미지 반환
  saveScreenshot: (base64: string, savePath: string, fileName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  copyScreenshot: (base64: string) => Promise<{ success: boolean; error?: string }>;
  selectFolder: (defaultPath: string) => Promise<string | null>;
  getAppVersion: () => Promise<string>;
  openMail: (email: string) => void;
  // 자동 업데이트
  checkForUpdates: () => Promise<{ success: boolean; version?: string; error?: string }>;
  quitAndInstall: () => Promise<void>;
  downloadUpdate: () => void;
  setUpdateNotify: (value: boolean) => void;
  onUpdateAvailable: (callback: (info: { version: string; manual?: boolean }) => void) => () => void;
  onUpdateProgress: (callback: (info: { percent: number; transferred?: number; total?: number; bytesPerSecond?: number }) => void) => () => void;
  /** manual: 트레이/설정에서 사용자가 명시적으로 호출했을 때 true. skipped 버전 우회. */
  onUpdateDownloaded: (callback: (info: { version: string; manual?: boolean }) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
  onUpdateError: (callback: (info: { message: string }) => void) => () => void;
  onWebviewBack: (callback: () => void) => () => void;
  onWebviewKey: (callback: (key: WebviewKeyEvent) => void) => () => void;
}

export interface WebviewKeyEvent {
  key: string;
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
