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
