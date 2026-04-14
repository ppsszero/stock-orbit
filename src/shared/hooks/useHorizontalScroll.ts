import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * 수평 스크롤 가능 영역의 좌우 화살표 상태를 관리하는 hook.
 * PresetTabs, GroupSelector에서 동일하게 사용되던 패턴 통합.
 *
 * Returns:
 * - scrollRef: 스크롤 컨테이너에 연결할 ref
 * - canScrollL/R: 좌/우 스크롤 가능 여부
 * - scroll(dir): 좌(-1)/우(1) 스크롤 실행
 */
export const useHorizontalScroll = (deps: React.DependencyList = []) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollL, setCanScrollL] = useState(false);
  const [canScrollR, setCanScrollR] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollL(el.scrollLeft > 0);
    setCanScrollR(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll);
    const ro = new ResizeObserver(checkScroll);
    if (el) ro.observe(el);
    return () => {
      el?.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const scroll = useCallback((dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 100, behavior: 'smooth' });
  }, []);

  return { scrollRef, canScrollL, canScrollR, scroll };
};
