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

export interface AppSettings {
  theme: 'light' | 'dark';
  opacity: number;
  alwaysOnTop: boolean;
  refreshInterval: number; // seconds
  tickerSpeed: number;     // px per second
  currencyMode: 'KRW' | 'USD';
  resolution: { width: number; height: number };
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  autoCleanLogs: boolean;
  autoLaunch: boolean;
  viewMode: 'list' | 'grid' | 'tile';
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
  nameEn?: string;
  nation: string;
  market: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'flat';
  currency: string;
  marketStatus: 'OPEN' | 'CLOSE' | 'PRE' | 'POST';
  updatedAt: string;
  reutersCode?: string;
  // 보조 데이터 (툴팁용)
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: string;
  tradingValue?: string;
  marketCap?: string;
  marketCapRaw?: number; // 원본 시가총액 (treemap 크기 계산용)
  per?: string;
  pbr?: string;
  week52High?: number;
  week52Low?: number;
  exchange?: string; // 거래소명 (KOSPI, NASDAQ 등)
  isTradingHalt?: boolean; // 거래정지 여부
}

// === Marquee Index/FX Data ===
export interface MarqueeItem {
  code: string;
  name: string;
  currentValue: number;
  change: number;
  changePercent: number;
  changeDirection: 'up' | 'down' | 'flat';
  type: 'index' | 'fx' | 'commodity';
}

// === Electron API ===
export interface ElectronAPI {
  minimize: () => void;
  close: () => void;
  setAlwaysOnTop: (value: boolean) => void;
  setAutoLaunch: (value: boolean) => void;
  setOpacity: (value: number) => void;
  setSize: (size: { width: number; height: number }) => void;
  getWindowSize: () => Promise<{ width: number; height: number }>;
  onAlwaysOnTopChanged: (callback: (value: boolean) => void) => void;
  onWindowResized: (callback: (size: { width: number; height: number }) => void) => void;
  naverFetch: (url: string) => Promise<{ data?: unknown; error?: string }>;
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
  onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
  onUpdateProgress: (callback: (info: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (info: { message: string }) => void) => () => void;
  onWebviewBack: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
