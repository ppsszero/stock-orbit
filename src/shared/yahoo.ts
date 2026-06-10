import { YahooStreamQuote } from '@/shared/types';

/**
 * 야후 파이낸스 해외 연장가/오버나잇 — 네이버가 안 주는 US 오버나잇(데이마켓) 가격만 빌림.
 * WS 스트리머 연결·구독·protobuf 디코드는 Electron 메인이 담당. 여기선 심볼매핑 + transform만(순수).
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

/** 스트리머 quote → ExtendedQuote. 가격 없으면 null (= 네이버 fallback). direction은 change 부호. */
export const toExtendedQuote = (q: YahooStreamQuote | undefined | null): ExtendedQuote | null => {
  if (q == null || q.price == null) return null;
  const c = q.change ?? 0;
  return { price: q.price, change: c, changePercent: q.changePercent ?? 0, direction: c > 0 ? 'up' : c < 0 ? 'down' : 'flat' };
};

/**
 * US 종목 목록 → { 네이버code: ExtendedQuote }.
 * 야후 미수신/stale 종목은 결과에서 누락 → 호출부에서 네이버 값 유지(fallback).
 */
export const fetchYahooExtended = async (
  items: { code: string; reutersCode?: string }[],
): Promise<Record<string, ExtendedQuote>> => {
  const out: Record<string, ExtendedQuote> = {};
  if (items.length === 0 || !window.electronAPI?.yahooQuotes) return out;

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
    const res = await window.electronAPI.yahooQuotes(tickers);
    for (const [ticker, q] of Object.entries(res.quotes || {})) {
      const code = tickerToCode[ticker];
      if (!code) continue;
      const ext = toExtendedQuote(q);
      if (ext) out[code] = ext;
    }
  } catch {
    /* 야후 실패 → 빈 결과 = 네이버 fallback */
  }
  return out;
};
