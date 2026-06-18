import { YahooStreamQuote, MarketSession, StockPrice, StockSymbol } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

/**
 * 야후 파이낸스 US 실시간가 차용 — 정규장: 네이버(지연)보다 신선한 가격 / 오버나잇(데이마켓): 네이버 미제공분.
 * 세션 권한은 네이버(applyYahooExtended 참조). WS 연결·구독·protobuf 디코드는 Electron 메인 담당.
 * 여기선 심볼매핑 + transform만(순수).
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

/**
 * 야후 파이낸스 종목 페이지 URL — 데이마켓(OVERNIGHT) 시세는 네이버 미제공이라 야후로 열 때 사용.
 * 티커 변환 실패(빈 값) 시 null 반환 — 호출부가 네이버 URL로 폴백.
 */
export const getYahooStockUrl = (
  symbol: Pick<StockSymbol, 'code' | 'reutersCode'>,
): string | null => {
  const ticker = toYahooTicker(symbol.reutersCode || symbol.code);
  return ticker ? `https://finance.yahoo.com/quote/${ticker}` : null;
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
      if (!ext) continue;
      // 활성 세션(정규/프리/장후/오버나잇) 전부 통과 — 실제 적용 여부는 applyYahooExtended가 네이버 base로 판단
      // (정규: 가격만 차용 / 오버나잇: 가격+세션 / 네이버 CLOSED인데 야후 비-오버나잇이면 스킵 → 표시값 거짓 방지).
      out[code] = ext;
      // 로그·학습은 데이마켓(OVERNIGHT)만 — 정규장 차용은 조용히(WS 로그 소음 방지).
      if (ext.session === 'OVERNIGHT' && code !== DM_SENTINEL.code) {
        const sign = ext.changePercent > 0 ? '+' : '';
        applied.push(`${ticker} ${ext.price}(${sign}${ext.changePercent.toFixed(2)}%)`);
      }
    }
    // 오버나잇 데이터를 받은 사용자 종목만 '데이마켓 가능'으로 학습(표시용 — 펄스 게이트)
    const learned = Object.keys(out).filter(c => c !== DM_SENTINEL.code && out[c].session === 'OVERNIGHT');
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
 * 네이버 가격맵에 야후 값을 머지 — 가격/등락/방향만 야후, 나머지(거래량·시총 등)는 네이버 base 유지.
 * 새 컨테이너 반환(불변). **활성 세션 응답을 받은 종목은 값 동일 여부와 무관하게** 새 StockPrice 객체
 * → usePriceFlash가 매 사이클 flash. flash = "값이 바뀜"이 아니라 "최신값을 방금 받음 = 라이브 갱신 중" 신호.
 * (사용자에겐 값 변동보다 '내가 최신 정보를 받고 있는가'가 더 중요 — 국내 종목도 매 폴링 새 객체라 같은 철학.)
 * CLOSED/미수신은 스킵 → 네이버 fallback, 참조 유지 → flash 없음 = '신선한 데이터 못 받음'을 정직하게 반영.
 * 해외 폴링 사이클과 데이마켓 fast 갱신이 공유(DRY).
 *
 * 세션 권한 = US는 야후 (가장 정확·신속 — 제품 결정):
 *  - 야후 활성 세션(정규/프리/장후/오버나잇)이면 가격·등락·세션 전부 야후로 덮음. 가격+세션이 한 출처라
 *    "가격은 움직이는데 장마감 표시" 같은 거짓 없음(정합). 개장/마감 전환에 네이버가 늦어도 야후가 즉시 반영.
 *  - 야후 CLOSED(미수신/장마감) → 스킵 → 네이버 fallback. (비미국은 selectYahooTargets에서 제외돼 ext에 없음)
 */
export const applyYahooExtended = (
  prices: Record<string, StockPrice>,
  ext: Record<string, ExtendedQuote>,
): Record<string, StockPrice> => {
  const out = { ...prices };
  for (const [code, e] of Object.entries(ext)) {
    const base = out[code];
    if (!base) continue;        // 네이버 base 없는 종목은 머지 안 함(표시 기반 유지)
    if (e.session === 'CLOSED') continue;   // 야후 미수신/장마감 → 네이버 유지(fallback)
    // US는 야후가 가격·세션 권한 — 활성 세션 전부 야후로 덮고, 나머지(거래량·시총 등)는 네이버 base 유지.
    // 값 동일 여부와 무관하게 항상 새 객체 → usePriceFlash가 매 사이클 flash(= '라이브 갱신 중' 신호).
    // 헛 flash가 아니라 의도된 갱신 신호 — 안 움직인 종목도 "방금 최신값 받음"을 사용자에게 표시.
    out[code] = {
      ...base,
      currentPrice: e.price, change: e.change, changePercent: e.changePercent,
      changeDirection: e.direction, marketStatus: e.session,
    };
  }
  return out;
};

/**
 * 야후 차용 대상 선택 — 네이버 base가 있는 US 종목 전부. 70초 사이클·15초 fast·부트스트랩
 * 전 경로가 이 단일 기준을 공유(기준이 다르면 구독 churn 발생).
 *
 * 세션 무관하게 넓게 잡는 이유 (적용 여부는 applyYahooExtended가 네이버 base 세션으로 최종 판단):
 *  - 정규/프리/장후: 야후 실시간가가 네이버(지연)보다 신선 → 가격만 차용(세션은 네이버 권한 유지).
 *  - 오버나잇(데이마켓): 네이버 미제공 → 야후만 제공(가격+세션 차용).
 *  - 장마감: 야후도 안 줌 → 결과 누락 → 네이버 유지(무해).
 *
 * ⚠ hasExtendedHours로 거르지 않는다 — 그 필드는 네이버 overMarketPriceInfo 존재 여부인데
 *   네이버가 시간대에 따라 종목별로 거둬가서 **세션 도중 깜빡인다**(2026-06-11 16:31 사고: 타겟 전멸).
 *   넓게 조회해도 야후가 가진 것만 반환하므로 무해. hasExtendedHours는 '연결중' 펄스 게이트 전용(StockRow/GridCard).
 *  base 없는 종목은 제외 — applyYahooExtended가 어차피 머지 못 함(구독만 낭비).
 */
export const selectYahooTargets = (
  overseasStocks: StockSymbol[],
  prices: Record<string, StockPrice> | undefined,
): { code: string; reutersCode?: string }[] => {
  if (!prices) return [];
  return overseasStocks
    .filter(s => s.nation === 'US' && !!prices[s.code])
    .map(s => ({ code: s.code, reutersCode: s.reutersCode }));
};
