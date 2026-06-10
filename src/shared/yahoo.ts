import { YahooRawQuote } from '@/shared/types';

/**
 * 야후 파이낸스 해외 연장가(데이마켓) — 네이버가 안 주는 US 프리/애프터마켓 가격만 빌림.
 * 인증(cookie+crumb)은 Electron 메인이 관리하고, 여기선 심볼매핑 + 응답 transform만 담당(순수).
 */

export interface ExtendedQuote {
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
}

/** 점 포함 클래스주 등 예외 — 네이버 reutersCode의 '.' 앞부분(base)을 키로. 필요 시 확장. */
const TICKER_EXCEPTIONS: Record<string, string> = {};

/** 네이버 reutersCode → 야후 티커. 기본은 '.' 앞부분 (US 전용 — JP 등은 호출부에서 제외). */
export const toYahooTicker = (reutersCode: string): string => {
  const base = (reutersCode || '').split('.')[0];
  return TICKER_EXCEPTIONS[base] || base;
};

/** marketState 기준 연장가 추출. CLOSED / 연장가 없음 → null (= 네이버 fallback). */
export const pickExtended = (q: YahooRawQuote): ExtendedQuote | null => {
  const st = q.marketState;
  let price: number | undefined, change: number | undefined, pct: number | undefined;
  if (st === 'PRE') {
    price = q.preMarketPrice; change = q.preMarketChange; pct = q.preMarketChangePercent;
  } else if (st === 'POST' || st === 'PREPRE' || st === 'POSTPOST') {
    price = q.postMarketPrice; change = q.postMarketChange; pct = q.postMarketChangePercent;
  } else if (st === 'REGULAR') {
    price = q.regularMarketPrice; change = q.regularMarketChange; pct = q.regularMarketChangePercent;
  } else {
    return null; // CLOSED 등 — 연장 체결 없음
  }
  if (price == null) return null;
  const c = change ?? 0;
  return { price, change: c, changePercent: pct ?? 0, direction: c > 0 ? 'up' : c < 0 ? 'down' : 'flat' };
};

/**
 * US 종목 목록 → { 네이버code: ExtendedQuote }.
 * 야후 실패/연장가 없는 종목은 결과에서 누락 → 호출부에서 네이버 값 유지(fallback).
 */
export const fetchYahooExtended = async (
  items: { code: string; reutersCode?: string }[],
): Promise<Record<string, ExtendedQuote>> => {
  const out: Record<string, ExtendedQuote> = {};
  if (items.length === 0 || !window.electronAPI?.yahooQuote) return out;

  // 야후 티커 → 네이버 code 역매핑
  const tickerToCode: Record<string, string> = {};
  const tickers: string[] = [];
  for (const it of items) {
    const t = toYahooTicker(it.reutersCode || it.code);
    if (!t) continue;
    tickerToCode[t] = it.code;
    tickers.push(t);
  }
  if (tickers.length === 0) return out;

  try {
    const res = await window.electronAPI.yahooQuote(tickers);
    for (const q of res.quotes || []) {
      const code = tickerToCode[q.symbol];
      if (!code) continue;
      const ext = pickExtended(q);
      if (ext) out[code] = ext;
    }
  } catch {
    /* 야후 실패 → 빈 결과 = 네이버 fallback */
  }
  return out;
};
