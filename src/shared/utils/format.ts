import { StockPrice, StockSymbol, NaverAutoCompleteItem } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';

// === 숫자 포맷 ===
/** 사실상 소수 자릿수가 없는 통화 (베트남 동, 일본 엔, 한국 원) */
const ZERO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND']);

export const fmtNum = (n: number, currency: string): string =>
  ZERO_DECIMAL_CURRENCIES.has(currency)
    ? n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtTime = (d: Date | null): string =>
  d ? d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--';

// === 국가 뱃지 색상 ===
export const NATION_BADGE: Record<string, { bg: string; fg: string }> = {
  KR: { bg: '#3182F620', fg: '#3182F6' },
  US: { bg: '#FF980020', fg: '#E65100' },
  JP: { bg: '#F0445220', fg: '#F04452' },
  CN: { bg: '#FF525220', fg: '#B71C1C' },
  HK: { bg: '#9C27B020', fg: '#6A1B9A' },
  UK: { bg: '#4CAF5020', fg: '#2E7D32' },
  VN: { bg: '#FFC10720', fg: '#F57F17' },
};

// === 카테고리 뱃지 색상 (지수/선물) ===
export const CATEGORY_BADGE: Record<string, { bg: string; fg: string }> = {
  index: { bg: '#16A08520', fg: '#16A085' },
  futures: { bg: '#8E44AD20', fg: '#8E44AD' },
};

// Naver autocomplete nationCode → 표시용 코드
export const mapNationCode = (code?: string): string =>
  ({ KOR: 'KR', USA: 'US', JPN: 'JP', CHN: 'CN', HKG: 'HK', GBR: 'UK', DEU: 'DE', VNM: 'VN' })[code || ''] || code || 'INT';

// === 로고 URL ===
export const getLogoUrl = (nation: string, code: string, reutersCode?: string): string => {
  if (!nation) return '';
  const key = nation === 'KR' ? code : (reutersCode || code);
  return `https://ssl.pstatic.net/imgstock/fn/real/logo/png/stock/Stock${key}.png`;
};

export const getLogoUrlFromSymbol = (sym: StockSymbol): string =>
  getLogoUrl(sym.nation, sym.code, sym.reutersCode);

export const getLogoUrlFromAutoComplete = (item: NaverAutoCompleteItem): string => {
  const isKR = item.nationCode === 'KOR';
  const key = isKR ? item.code : (item.reutersCode || item.code);
  return `https://ssl.pstatic.net/imgstock/fn/real/logo/png/stock/Stock${key}.png`;
};

// === 등락 표시 유틸 ===
// NOTE: 네이버 API의 changeDirection 필드를 기반으로 화살표/부호를 결정.
// change 값의 부호(양수/음수)로 판단하면 안 됨 — 국내주식 API에서 부호가 불일치하는 경우 있음.
type Direction = 'up' | 'down' | 'flat';

/** '▲' / '▼' / '' */
export const dirArrow = (d: Direction): string =>
  d === 'up' ? '▲' : d === 'down' ? '▼' : '';

/** '+' / '-' / '' */
export const dirSign = (d: Direction): string =>
  d === 'up' ? '+' : d === 'down' ? '-' : '';

/** sem.feedback 색상 토큰을 direction에 따라 반환 */
export const getDirColor = (d: Direction): string =>
  d === 'up' ? sem.feedback.up : d === 'down' ? sem.feedback.down : sem.feedback.flat;

/** '+1.35%' / '-0.50%' / '0.00%' */
export const fmtPercent = (d: Direction, pct: number): string =>
  `${dirSign(d)}${Math.abs(pct).toFixed(2)}%`;

/** '▲ 1.35%' / '▼ 0.50%' / '─ 0.00%' — 마퀴/그리드/랭킹 공용 (화살표 + 절대%) */
export const fmtPercentArrow = (d: Direction, pct: number): string =>
  `${dirArrow(d) || '─'} ${Math.abs(pct).toFixed(2)}%`;

/** '1.35%' — 방향 표시는 다른 곳에서 처리할 때 */
export const fmtPercentAbs = (pct: number): string =>
  `${Math.abs(pct).toFixed(2)}%`;

/**
 * '▲ 1,000 (+1.35%)' — 리스트/시장지표 공용 (화살표 + 값 + 부호%).
 * valueStr은 호출 측에서 통화/소수점 규칙에 맞게 미리 포맷한 문자열을 전달.
 */
export const fmtChangeArrow = (d: Direction, pct: number, valueStr: string): string =>
  `${dirArrow(d) || '─'} ${valueStr} (${fmtPercent(d, pct)})`;

// === 타임스탬프 (파일명용) ===
/** 'YYYYMMDD-HHmmss' 형식 */
export const fmtTimestamp = (d: Date): string => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
  '-',
  String(d.getHours()).padStart(2, '0'),
  String(d.getMinutes()).padStart(2, '0'),
  String(d.getSeconds()).padStart(2, '0'),
].join('');

// === 해외 ETF 약칭 판별 ===
export const getDisplayName = (p: StockPrice | null, sym: StockSymbol): string => {
  const name = p?.name || sym?.name || '';
  if (!sym?.nation) return name;
  if (sym.nation !== 'KR' && p?.code && !/[가-힣]/.test(name)) return p.code;
  return name;
};
