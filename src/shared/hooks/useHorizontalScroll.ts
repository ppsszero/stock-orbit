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
    // 화살표 버튼(~22px)이 나타나면 컨테이너가 줄어들어 판정이 흔들리므로 여유값 확보
    const THRESHOLD = 24;
    setCanScrollL(el.scrollLeft > THRESHOLD);
    setCanScrollR(el.scrollLeft + el.clientWidth < el.scrollWidth - THRESHOLD);
  }, []);

  // 마우스 휠 → 가로 스크롤 변환 (스크롤바 숨김 상태에서도 휠로 탐색 가능)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
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
    const el = scrollRef.current;
    if (!el) return;
    // 보이는 영역의 80%만큼 이동 — 맥락 유지를 위해 20% 겹침
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  }, [checkScroll]);

  return { scrollRef, canScrollL, canScrollR, scroll };
};
