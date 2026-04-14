import { useQuery } from '@tanstack/react-query';
import { StockPrice, StockSymbol } from '@/shared/types';
import { fetchDomesticStock, fetchOverseasStock } from '@/shared/naver';

/** 한 배치당 요청 수 */
const BATCH_SIZE = 10;
/**
 * 배치 사이의 지연 (ms) — 병렬 폭주 방지용 최소 간격.
 * 너무 길면 전체 사이클이 늘어지고(→ 마지막 배치 종목의 최신성 저하),
 * 너무 짧으면 네이버 서버에 스파이크 부담. 3초가 실측 기준 현실적 절충점.
 */
const BATCH_DELAY_MS = 3_000;
/** 이 수 이하면 배치 없이 한 번에 요청 */
const BATCH_THRESHOLD = 10;

const fetchOne = (sym: StockSymbol): Promise<StockPrice | null> =>
  sym.nation === 'KR'
    ? fetchDomesticStock(sym.code)
    : fetchOverseasStock(sym.reutersCode || sym.code);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * 종목 수가 많으면 10개씩 쪼개서 3초 간격으로 병렬 요청 전송.
 * - 각 배치 내부는 Promise.allSettled로 동시 요청 (10개)
 * - 배치 간은 sleep으로 서버 스파이크 완화
 * - 실패 종목은 누락(null) 처리, 성공 종목만 가격 업데이트
 *
 * 타이밍 (예: 30개 종목, refreshInterval=30s)
 *   T=0s  Batch 1 발사
 *   T=3s  Batch 2 발사
 *   T=6s  Batch 3 발사  → queryFn 완료 (~7s)
 *   T=37s 다음 사이클 시작 (React Query의 refetchInterval은 "완료 기준"이므로
 *         마지막 배치 완료 후 refreshInterval만큼 대기)
 *
 *   각 종목의 실효 갱신 주기 ≈ refreshInterval + 배치 소요시간
 */
const fetchInBatches = async (symbols: StockSymbol[]): Promise<Record<string, StockPrice>> => {
  const out: Record<string, StockPrice> = {};
  if (symbols.length === 0) return out;

  const runBatch = async (batch: StockSymbol[]) => {
    const results = await Promise.allSettled(batch.map(fetchOne));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) out[batch[i].code] = r.value;
    });
  };

  if (symbols.length <= BATCH_THRESHOLD) {
    await runBatch(symbols);
    return out;
  }

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    await runBatch(batch);
    if (i + BATCH_SIZE < symbols.length) await sleep(BATCH_DELAY_MS);
  }
  return out;
};

/**
 * 종목별 실시간 가격 폴링.
 * 30초 기본 주기 + ±5초 지터로 서버 부하 스파이크 방지.
 */
export const useStockPrices = (symbols: StockSymbol[], refreshInterval: number) => {
  const { data: prices = {}, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['stockPrices', symbols.map(s => s.code).sort()],
    queryFn: () => fetchInBatches(symbols),
    // jitter: ±5초 랜덤 오프셋으로 여러 사용자 동시 요청 분산
    refetchInterval: () => refreshInterval * 1000 + (Math.random() * 10_000 - 5_000),
    enabled: symbols.length > 0,
    // naver.ts의 rate-limit 백오프가 재시도를 이미 지연 처리하므로
    // React Query 자동 재시도를 꺼서 중복 요청과 backoff 충돌을 방지
    retry: false,
  });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  return { prices, loading: isLoading, lastUpdated, refresh: refetch };
};
