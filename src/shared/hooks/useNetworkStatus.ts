import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

const getSnapshot = () => navigator.onLine;

/** 브라우저 네트워크 연결 상태를 반환 (true = 온라인) */
export const useNetworkStatus = () => useSyncExternalStore(subscribe, getSnapshot);
