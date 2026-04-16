import { useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StockPrice, StockSymbol, inferCategory } from '@/shared/types';
import {
  fetchDomesticStocksBatch,
  fetchOverseasStocksBatch,
  fetchDomesticIndex,
  fetchOverseasIndex,
  fetchOverseasFutures,
} from '@/shared/naver';

/** 한 배치당 요청할 종목 수 — 부정사용 의심 방지를 위해 10개 단위 */
const BATCH_SIZE = 10;
/**
 * 배치 사이의 지연 (ms).
 * 기존 개별 요청 대비 트래픽이 크게 줄었으므로 1.5초로 단축.
 */
const BATCH_DELAY_MS = 1_500;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * 종목을 국내주식 · 해외주식 · 지수 · 선물로 분류.
 * 주식은 batch polling으로 한 번에, 지수/선물은 기존 개별 API 사용.
 */
const classifySymbols = (symbols: StockSymbol[]) => {
  const domesticStocks: StockSymbol[] = [];
  const overseasStocks: StockSymbol[] = [];
  const indexFutures: StockSymbol[] = [];

  for (const sym of symbols) {
    const cat = inferCategory(sym);
    if (cat === 'index' || cat === 'futures') {
      indexFutures.push(sym);
    } else if (sym.nation === 'KR') {
      domesticStocks.push(sym);
    } else {
      overseasStocks.push(sym);
    }
  }
  return { domesticStocks, overseasStocks, indexFutures };
};

/** 지수/선물은 기존 개별 API 유지 (종목 수가 적고 배치 미지원) */
const fetchOneIndexFutures = (sym: StockSymbol): Promise<StockPrice | null> => {
  const c = sym.code.toUpperCase();
  const rc = (sym.reutersCode || '').toUpperCase();
  const cat = inferCategory(sym);

  if (cat === 'index') {
    if (c.startsWith('.') || rc.startsWith('.')) return fetchOverseasIndex(sym.reutersCode || sym.code);
    return fetchDomesticIndex(sym.code);
  }
  // futures
  if (/CV\d+$/i.test(c) || /CV\d+$/i.test(rc)) return fetchOverseasFutures(sym.reutersCode || sym.code);
  return fetchDomesticIndex(sym.code);
};

/**
 * 배치 polling + 지수/선물 개별 호출을 통합하는 메인 fetcher.
 *
 * 국내주식: 10개씩 묶어서 1회 요청
 * 해외주식: 10개씩 묶어서 1회 요청 (polling.finance.naver.com)
 * 지수/선물: 기존 개별 API
 */
const fetchAllPrices = async (
  symbols: StockSymbol[],
  onProgress?: (ratio: number) => void,
): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (symbols.length === 0) return out;

  const { domesticStocks, overseasStocks, indexFutures } = classifySymbols(symbols);

  // 전체 배치 수 계산 (진행률 산정용)
  const domesticBatches = Math.ceil(domesticStocks.length / BATCH_SIZE);
  const overseasBatches = Math.ceil(overseasStocks.length / BATCH_SIZE);
  const totalSteps = domesticBatches + overseasBatches + (indexFutures.length > 0 ? 1 : 0);
  let doneSteps = 0;
  const reportProgress = () => {
    doneSteps++;
    onProgress?.(totalSteps > 0 ? doneSteps / totalSteps : 1);
  };

  // 1. 국내주식 배치 polling (10개씩)
  for (let i = 0; i < domesticStocks.length; i += BATCH_SIZE) {
    const batch = domesticStocks.slice(i, i + BATCH_SIZE);
    const codes = batch.map(s => s.code);
    const result = await fetchDomesticStocksBatch(codes);
    Object.assign(out, result);
    reportProgress();
    if (i + BATCH_SIZE < domesticStocks.length) await sleep(BATCH_DELAY_MS);
  }

  // 2. 해외주식 배치 polling (10개씩)
  for (let i = 0; i < overseasStocks.length; i += BATCH_SIZE) {
    const batch = overseasStocks.slice(i, i + BATCH_SIZE);
    const reutersCodes = batch.map(s => s.reutersCode || s.code);
    const result = await fetchOverseasStocksBatch(reutersCodes);
    // 해외주식은 symbolCode(NVDA)로 키가 돌아오므로, 원본 code 기준으로도 매핑
    for (const sym of batch) {
      const key = sym.code;
      const rc = sym.reutersCode || sym.code;
      const symbolCode = rc.split('.')[0];
      const price = result[symbolCode] || result[key] || result[rc];
      if (price) out[key] = price;
    }
    reportProgress();
    if (i + BATCH_SIZE < overseasStocks.length) await sleep(BATCH_DELAY_MS);
  }

  // 3. 지수/선물 병렬 개별 호출
  if (indexFutures.length > 0) {
    const results = await Promise.allSettled(indexFutures.map(fetchOneIndexFutures));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) out[indexFutures[i].code] = r.value;
    });
    reportProgress();
  }

  return out;
};

/**
 * 종목별 실시간 가격 폴링.
 * 30초 기본 주기 + ±5초 지터로 서버 부하 스파이크 방지.
 * progress(0~1)를 반환하여 UI에서 진행 상황을 표시할 수 있음.
 */
export const useStockPrices = (symbols: StockSymbol[], refreshInterval: number) => {
  // progress를 ref로 관리 — setState로 하면 queryFn 안에서 리렌더 폭풍
  // 외부에서 구독할 수 있도록 콜백 패턴 사용
  const progressRef = useRef(0);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const setProgress = useCallback((v: number) => {
    progressRef.current = v;
    listenersRef.current.forEach(fn => fn());
  }, []);

  // 언마운트 시 리스너 정리
  useEffect(() => () => { listenersRef.current.clear(); }, []);

  const { data: prices = {}, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['stockPrices', symbols.map(s => s.code).sort()],
    queryFn: () => {
      setProgress(0);
      return fetchAllPrices(symbols, setProgress);
    },
    // jitter: ±5초 랜덤 오프셋으로 여러 사용자 동시 요청 분산
    refetchInterval: () => refreshInterval * 1000 + (Math.random() * 10_000 - 5_000),
    enabled: symbols.length > 0,
    // naver.ts의 rate-limit 백오프가 재시도를 이미 지연 처리하므로
    // React Query 자동 재시도를 꺼서 중복 요청과 backoff 충돌을 방지
    retry: false,
    // 매 fetch마다 새 객체 참조 보장 → usePriceFlash가 갱신 감지 가능
    structuralSharing: false,
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  return {
    prices,
    loading: isLoading,
    fetching: isFetching,
    lastUpdated,
    refresh: refetch,
    /** progress ref + subscribe — StatusBar에서 useSyncExternalStore로 구독 */
    progressRef,
    subscribeProgress: useCallback((fn: () => void) => {
      listenersRef.current.add(fn);
      return () => { listenersRef.current.delete(fn); };
    }, []),
  };
};
