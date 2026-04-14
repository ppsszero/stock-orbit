import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';

// 네트워크 상태 연동 — 오프라인 시 쿼리 pause, 복귀 시 자동 refetch
onlineManager.setEventListener(setOnline => {
  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      networkMode: 'online', // 오프라인 시 자동 pause
    },
  },
});

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  // 온라인 복귀 시 stale 쿼리 모두 refetch
  useEffect(() => {
    const handleOnline = () => queryClient.invalidateQueries();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
