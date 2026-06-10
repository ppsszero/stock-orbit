import { StockPrice, StockSymbol, NaverAutoCompleteItem, MarketSession } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';

// === 시장 세션 ===
/** 세션 → 표시 라벨 (live/close 위치에 표시) */
export const SESSION_LABEL: Record<MarketSession, string> = {
  REGULAR: '정규',
  PRE: '프리',
  AFTER: '애프터',
  OVERNIGHT: '데이',
  CLOSED: '장마감',
};

/** live 여부 — CLOSED 외 전부 거래 중. (가격 없음/undefined는 live 아님) */
export const isLiveSession = (s?: MarketSession): boolean => s !== undefined && s !== 'CLOSED';

// === 숫자 포맷 ===
/** 사실상 소수 자릿수가 없는 통화 (베트남 동, 일본 엔, 한국 원) */
const ZERO_DECIMAL_CURRENCIES = new Set(['KRW', 'JPY', 'VND']);

export const fmtNum = (n: number, currency: string): string =>
  ZERO_DECIMAL_CURRENCIES.has(currency)
    ? n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtTime = (d: Date | null): string =>
  d ? d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--';

/** 'YYYY-MM-DD HH:MM:SS' 등 Date → 상대 시간 ("방금 전", "5분 전", "2시간 전", "어제") */
export const fmtRelativeTime = (d: Date | null): string => {
  if (!d) return '갱신 전';
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 30) return '방금 전';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
};

// === 국가 뱃지 색상 ===
// KR은 다크/라이트 accent 색이 달라서 hex 고정하면 다크 모드에서 본문 accent와 불일치.
// → accent 토큰(sem.action.primary/primaryTint)으로 매핑해 모드별 자동 분기.
// 나머지 국가는 모드 무관 단일 hue.
export const NATION_BADGE: Record<string, { bg: string; fg: string }> = {
  KR: { bg: sem.action.primaryTint, fg: sem.action.primary },
  US: { bg: '#FF980020', fg: '#E65100' },
  JP: { bg: '#26A69A20', fg: '#26A69A' },
  CN: { bg: '#E91E6320', fg: '#E91E63' },
  HK: { bg: '#9C27B020', fg: '#AB47BC' },
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
export type Direction = 'up' | 'down' | 'flat';

/** '▲' / '▼' / '' */
export const dirArrow = (d: Direction): string =>
  d === 'up' ? '▲' : d === 'down' ? '▼' : '';

/** '+' / '-' / '' */
export const dirSign = (d: Direction): string =>
  d === 'up' ? '+' : d === 'down' ? '-' : '';

/** sem.feedback 색상 토큰을 direction에 따라 반환 */
export const getDirColor = (d: Direction): string =>
  d === 'up' ? sem.feedback.up : d === 'down' ? sem.feedback.down : sem.feedback.flat;

/**
 * 부호 있는 표시 문자열에서 방향 추출 ("+12,345" → 'up', "-1,000" → 'down', "0"/"+0" → 'flat').
 * raw 표시 문자열만 받는 외부 API 응답을 transform 단계에서 SignedValue로 만들 때 사용.
 */
export const parseSignDirection = (value: string): Direction => {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    const num = parseFloat(trimmed);
    return num === 0 ? 'flat' : 'up';
  }
  if (trimmed.startsWith('-')) {
    const num = parseFloat(trimmed);
    return num === 0 ? 'flat' : 'down';
  }
  return 'flat';
};

/** '+1.35%' / '-0.50%' / '0.00%' */
export const fmtPercent = (d: Direction, pct: number): string =>
  `${dirSign(d)}${Math.abs(pct).toFixed(2)}%`;

/** '▲ 1.35%' / '▼ 0.50%' / '0.00%' — 마퀴/그리드/랭킹 공용 (화살표 + 절대%) */
export const fmtPercentArrow = (d: Direction, pct: number): string => {
  const arrow = dirArrow(d);
  return arrow ? `${arrow} ${Math.abs(pct).toFixed(2)}%` : `${Math.abs(pct).toFixed(2)}%`;
};

/** '1.35%' — 방향 표시는 다른 곳에서 처리할 때 */
export const fmtPercentAbs = (pct: number): string =>
  `${Math.abs(pct).toFixed(2)}%`;

/**
 * '▲ 1,000 (+1.35%)' — 리스트/시장지표 공용 (화살표 + 값 + 부호%).
 * valueStr은 호출 측에서 통화/소수점 규칙에 맞게 미리 포맷한 문자열을 전달.
 */
export const fmtChangeArrow = (d: Direction, pct: number, valueStr: string): string => {
  const arrow = dirArrow(d);
  return arrow ? `${arrow} ${valueStr} (${fmtPercent(d, pct)})` : `${valueStr} (${fmtPercent(d, pct)})`;
};

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
