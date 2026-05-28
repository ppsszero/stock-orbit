import { useRef, useState, useEffect } from 'react';

/**
 * 텍스트가 ellipsis로 잘렸는지 감지하는 훅.
 *
 * - 텍스트 변경(`text`)과 컨테이너 리사이즈 양쪽에 반응 (ResizeObserver)
 * - 1프레임 대기 후 측정 — Emotion CSS 적용 타이밍 보정
 *
 * StockRow / GridCard / StockTile 등 종목 이름이 ellipsis 처리되는 곳에서
 * Tooltip과 조합해 잘릴 때만 풀네임 노출하는 패턴에 사용.
 *
 * 사용:
 * ```tsx
 * const { ref, truncated } = useIsTruncated(displayName);
 * <Tooltip content={truncated ? displayName : ''}>
 *   <span ref={ref} css={ellipsisStyle}>{displayName}</span>
 * </Tooltip>
 * ```
 */
export const useIsTruncated = (text: string) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      setTruncated(el.scrollWidth > el.clientWidth);
    });
    const ro = new ResizeObserver(() => {
      setTruncated(el.scrollWidth > el.clientWidth);
    });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [text]);

  return { ref, truncated };
};
