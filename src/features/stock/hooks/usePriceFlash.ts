import { useRef, useState, useEffect } from 'react';
import type { StockPrice } from '@/shared/types';

/**
 * 종목 데이터 갱신 시 짧은 flash 상태를 반환하는 훅.
 * 가격 변동 여부와 무관하게, 새 데이터가 들어오면 flash 발생.
 * (배치 폴링에서 어떤 종목이 방금 갱신됐는지 시각적으로 구분)
 *
 * @param price StockPrice 객체 (참조가 바뀌면 갱신으로 판단)
 * @param duration flash 유지 시간 (ms)
 * @returns 'up' | 'down' | null — flash 방향 (null이면 애니메이션 없음)
 */
export const usePriceFlash = (
  price: StockPrice | null | undefined,
  direction: 'up' | 'down' | 'flat',
  duration = 600,
): 'up' | 'down' | null => {
  const prevRef = useRef(price);
  const initialized = useRef(false);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // 최초 로드 시에는 flash 안 함
    if (!initialized.current) {
      if (price) initialized.current = true;
      prevRef.current = price;
      return;
    }
    // 객체 참조가 바뀌면 = 새 데이터 도착
    if (price && price !== prevRef.current) {
      prevRef.current = price;
      const flashDir = direction === 'flat' ? 'up' : direction;
      setFlash(flashDir);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(null), duration);
    }
  }, [price, direction, duration]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return flash;
};
