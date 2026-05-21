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

  // 마우스 휠 → 가로 스크롤 + drag-to-scroll
  // (스크롤바 숨김 상태에서도 휠/드래그로 탐색 가능)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    const DRAG_THRESHOLD = 5;
    let isDown = false, startX = 0, baseScrollLeft = 0, dragged = false;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true; dragged = false;
      startX = e.pageX;
      baseScrollLeft = el.scrollLeft;
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (!dragged && Math.abs(dx) > DRAG_THRESHOLD) {
        dragged = true;
        el.style.cursor = 'grabbing';
      }
      if (dragged) {
        e.preventDefault();
        el.scrollLeft = baseScrollLeft - dx;
      }
    };
    const endDrag = () => { isDown = false; el.style.cursor = ''; };
    // drag 도중 발생한 click은 capture phase에서 stopPropagation해 자식 탭의 onClick 차단
    const onClickCapture = (e: MouseEvent) => {
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', endDrag);
    el.addEventListener('mouseleave', endDrag);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', endDrag);
      el.removeEventListener('mouseleave', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
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
