import { useEffect, useState, useCallback } from 'react';

/**
 * 스크롤 바닥 감지 → onLoadMore 콜백 호출.
 *
 * callback ref 패턴 사용: DOM 요소가 마운트/언마운트될 때
 * state가 갱신되어 effect가 재실행됨.
 * (useRef는 .current 변경이 effect를 재실행하지 않아
 *  조건부 렌더링 시 리스너가 등록되지 않는 버그 발생)
 */
export const useInfiniteScroll = (onLoadMore: () => void, enabled: boolean) => {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const scrollRef = useCallback((node: HTMLDivElement | null) => setEl(node), []);

  useEffect(() => {
    if (!el || !enabled) return;

    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        onLoadMore();
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [el, onLoadMore, enabled]);

  return scrollRef;
};
