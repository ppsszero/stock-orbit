import { useQuery } from '@tanstack/react-query';
import { MarqueeItem } from '@/shared/types';
import { fetchDomesticIndices, fetchWorldIndices, fetchCommodities, fetchFXRates } from '@/shared/naver';

export const useMarqueeData = (refreshInterval: number) => {
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['marqueeData'],
    queryFn: async () => {
      const [domestic, world, commodities, fx] = await Promise.allSettled([
        fetchDomesticIndices(),
        fetchWorldIndices(),
        fetchCommodities(),
        fetchFXRates(),
      ]);

      const all: MarqueeItem[] = [
        ...(domestic.status === 'fulfilled' ? domestic.value : []),
        ...(world.status === 'fulfilled' ? world.value : []),
        ...(commodities.status === 'fulfilled' ? commodities.value : []),
        ...(fx.status === 'fulfilled' ? fx.value : []),
      ];
      return all;
    },
    refetchInterval: refreshInterval * 1000,
  });

  return { items, loading: isLoading, refresh: refetch };
};
