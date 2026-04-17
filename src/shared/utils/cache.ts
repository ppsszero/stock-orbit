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
