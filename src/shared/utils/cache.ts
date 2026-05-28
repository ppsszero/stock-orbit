/**
 * 단순 시간 기반 메모리 캐시.
 * 같은 키로 TTL 내에 재호출하면 캐시된 결과를 반환.
 * 수동 새로고침 시 forceRefresh로 캐시 무시 가능.
 */
const store = new Map<string, { data: unknown; expireAt: number }>();

export const cached = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  forceRefresh = false,
): Promise<T> => {
  if (!forceRefresh) {
    const entry = store.get(key);
    if (entry && Date.now() < entry.expireAt) return entry.data as T;
  }
  const data = await fetcher();
  store.set(key, { data, expireAt: Date.now() + ttlMs });
  return data;
};

/**
 * `cached`의 status-aware 버전 — fromCache 플래그로 실제 fetch 여부 노출.
 * lastUpdatedAt 갱신 같이 "fresh fetch가 일어났을 때만" 트리거할 액션이 있을 때 사용.
 */
export const cachedWithStatus = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  forceRefresh = false,
): Promise<{ data: T; fromCache: boolean }> => {
  if (!forceRefresh) {
    const entry = store.get(key);
    if (entry && Date.now() < entry.expireAt) return { data: entry.data as T, fromCache: true };
  }
  const data = await fetcher();
  store.set(key, { data, expireAt: Date.now() + ttlMs });
  return { data, fromCache: false };
};
