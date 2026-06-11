import { YahooStreamQuote, MarketSession, StockPrice, StockSymbol } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

/**
 * 야후 파이낸스 해외 연장가/오버나잇 — 네이버가 안 주는 US 오버나잇(데이마켓) 가격만 빌림.
 * WS 스트리머 연결·구독·protobuf 디코드는 Electron 메인이 담당. 여기선 심볼매핑 + transform만(순수).
 */

export interface ExtendedQuote {
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  session: MarketSession;
}

/** 야후 marketHours → 세션. 0=장전 1=정규 2=장후 4=오버나잇. 미지(-1/누락 등)는 CLOSED로(가짜 live 방지). */
const sessionFromMarketHours = (mh: number): MarketSession =>
  mh === 0 ? 'PRE' : mh === 1 ? 'REGULAR' : mh === 2 ? 'AFTER' : mh === 4 ? 'OVERNIGHT' : 'CLOSED';

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
  return {
    price: q.price,
    change: c,
    changePercent: q.changePercent ?? 0,
    direction: c > 0 ? 'up' : c < 0 ? 'down' : 'flat',
    session: sessionFromMarketHours(q.marketHours),
  };
};

/**
 * 데이마켓 세션 감지용 센티널 — 오버나잇 최고 유동성 ETF(QQQ)라 세션 열려 있으면 초 단위로 틱.
 * 사용자 종목이 전부 저유동(첫 틱까지 수십초~분)이어도 "세션 열림"을 시그널로 확정해 '연결중' 유지.
 * UI 미표시: 이 code는 가격맵에 없으므로 applyYahooExtended가 머지 스킵, WS 로그에서도 제외.
 */
export const DM_SENTINEL = { code: '__dmSentinel__', reutersCode: 'QQQ' } as const;

// ── 데이마켓 가능 종목 학습 (표시용 — '연결중' 펄스 게이트) ──
// "한 번이라도 야후 오버나잇 데이터를 받은 종목 = 데이마켓 가능"은 확정 사실이라 시간대에 안 흔들림.
// (hasExtendedHours는 네이버가 시간대 따라 거둬가서 펄스가 안 뜨는 구멍 발생 → 학습으로 보강.)
// localStorage 영속 → 재시작/다음날 부트스트랩 때도 '연결중→데이' 순서 보장. 데이터 경로와는 무관(표시 전용).
const DM_CAPABLE_KEY = 'orbit-daymarket-codes';
let dmCapableCache: Set<string> | null = null;
const loadDmCapable = (): Set<string> => {
  if (!dmCapableCache) {
    try { dmCapableCache = new Set(JSON.parse(localStorage.getItem(DM_CAPABLE_KEY) || '[]')); }
    catch { dmCapableCache = new Set(); }
  }
  return dmCapableCache;
};
/** 이 종목이 데이마켓(오버나잇) 데이터를 받은 적 있는지 — '연결중' 펄스 표시 판단용 */
export const isDaymarketCapable = (code: string): boolean => loadDmCapable().has(code);
export const rememberDaymarketCapable = (codes: string[]): void => {
  const set = loadDmCapable();
  let added = false;
  for (const c of codes) if (!set.has(c)) { set.add(c); added = true; }
  if (added) {
    try { localStorage.setItem(DM_CAPABLE_KEY, JSON.stringify([...set].slice(-100))); }   // 최근 100개만 영속(무한 증가 방지)
    catch { /* 영속 실패해도 in-memory로 동작 */ }
  }
};

/** 타겟에 센티널 추가 — 사용자가 이미 QQQ를 추적 중이면 그게 센티널 역할(중복/충돌 방지). */
export const withDaymarketSentinel = (
  targets: { code: string; reutersCode?: string }[],
): { code: string; reutersCode?: string }[] =>
  targets.some(t => toYahooTicker(t.reutersCode || t.code) === DM_SENTINEL.reutersCode)
    ? targets
    : [...targets, DM_SENTINEL];

/**
 * US 종목 목록 → { 네이버code: ExtendedQuote }.
 * 야후 미수신/stale 종목은 결과에서 누락 → 호출부에서 네이버 값 유지(fallback).
 *
 * @param silentWhenEmpty 적용 0건일 때 WS 로그 스킵. fast 갱신(15초)이 부트스트랩 시도하며
 *   매번 "0건 적용 · 끊김" 소음 내는 걸 방지. WS 헬스 로그는 70초 해외 사이클이 계속 남김.
 */
export const fetchYahooExtended = async (
  items: { code: string; reutersCode?: string }[],
  silentWhenEmpty = false,
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
    const applied: string[] = [];
    for (const [ticker, q] of Object.entries(res.quotes || {})) {
      const code = tickerToCode[ticker];
      if (!code) continue;
      const ext = toExtendedQuote(q);
      // 오버나잇(데이마켓)만 빌림 — 프리/정규/장후는 네이버가 제공(이때 네이버 CLOSED 아니라 트리거도 안 됨).
      // 야후가 정규/장후를 줘도 네이버 CLOSED를 덮어쓰지 않음(표시값 거짓 방지).
      if (ext && ext.session === 'OVERNIGHT') {
        out[code] = ext;
        if (code === DM_SENTINEL.code) continue;   // 센티널은 세션 감지용 — 로그에서 제외
        const sign = ext.changePercent > 0 ? '+' : '';
        applied.push(`${ticker} ${ext.price}(${sign}${ext.changePercent.toFixed(2)}%)`);
      }
    }
    // 오버나잇 데이터를 받은 사용자 종목은 '데이마켓 가능'으로 학습(표시용 — 펄스 게이트)
    const learned = Object.keys(out).filter(c => c !== DM_SENTINEL.code);
    if (learned.length > 0) rememberDaymarketCapable(learned);

    const m = res.meta;
    // meta가 없으면 = 옛 메인 프로세스(electron/main.js HMR 안 됨). "끊김"으로 오인 방지.
    const wsState = !m
      ? '메인 재시작 필요(meta 없음 — dev 재기동)'
      : `WS ${m.connected ? '연결' : '끊김'} · 구독 ${m.tracked} · 신선 ${m.fresh}`;
    // 로그 분모도 센티널 제외 — 사용자 종목 수 기준
    const userTotal = tickerToCode[DM_SENTINEL.reutersCode] === DM_SENTINEL.code ? tickers.length - 1 : tickers.length;
    if (!(silentWhenEmpty && applied.length === 0)) {
      logger.ws(
        `오버나잇 ${applied.length}/${userTotal}개 적용`,
        `${wsState}${applied.length ? ' · ' + applied.join(', ') : ' · (프레임 대기중 — 다음 사이클 반영)'}`,
      );
    }
  } catch (e) {
    logger.ws('오버나잇 조회 실패 — 네이버 fallback', String(e));   // 야후 실패 → 빈 결과 = 네이버 유지
  }
  return out;
};

/**
 * 네이버 가격맵에 야후 오버나잇 값을 머지 — 가격/등락/방향/세션만 야후, 나머지(거래량·시총 등)는 네이버 base 유지.
 * 새 컨테이너 반환(불변). 교체된 종목만 새 StockPrice 객체 → usePriceFlash가 해당 종목만 flash.
 * 해외 폴링 사이클과 데이마켓 fast 갱신이 공유(DRY).
 */
export const applyYahooExtended = (
  prices: Record<string, StockPrice>,
  ext: Record<string, ExtendedQuote>,
): Record<string, StockPrice> => {
  const out = { ...prices };
  for (const [code, e] of Object.entries(ext)) {
    const base = out[code];
    if (!base) continue;   // 네이버 base 없는 종목은 머지 안 함(표시 기반 유지)
    out[code] = {
      ...base,
      currentPrice: e.price,
      change: e.change,
      changePercent: e.changePercent,
      changeDirection: e.direction,
      marketStatus: e.session,   // 데이마켓(OVERNIGHT) 등 야후 세션
    };
  }
  return out;
};

/**
 * 데이마켓 조회 대상 선택 — US 종목 중 OVERNIGHT(유지) 또는 CLOSED(진입). 70초 사이클·15초 fast·부트스트랩
 * 전 경로가 이 단일 기준을 공유(기준이 다르면 구독 churn 발생).
 *
 * ⚠ 데이터 경로는 hasExtendedHours로 거르지 않는다 — 그 필드는 네이버 overMarketPriceInfo 존재 여부인데
 *   네이버가 시간대에 따라(예: 프리마켓 직전 오후) 종목별로 거둬가서 **세션 도중 false로 깜빡인다**.
 *   실제 사고(2026-06-11 16:31): 필터 적용 후 타겟이 1개→0개로 줄며 야후 차용 전멸, 전부 '장마감' 회귀.
 *   넓게 조회해도 야후가 가진 것만 반환하므로 무해(미지원 종목은 영영 안 옴 → 네이버 유지).
 *   hasExtendedHours는 **표시('연결중' 펄스) 게이트 전용** — StockRow/GridCard에서만 사용.
 */
export const selectDaymarketTargets = (
  overseasStocks: StockSymbol[],
  prices: Record<string, StockPrice> | undefined,
): { code: string; reutersCode?: string }[] => {
  if (!prices) return [];
  return overseasStocks
    .filter(s => {
      const p = prices[s.code];
      return s.nation === 'US' && (p?.marketStatus === 'OVERNIGHT' || p?.marketStatus === 'CLOSED');
    })
    .map(s => ({ code: s.code, reutersCode: s.reutersCode }));
};
