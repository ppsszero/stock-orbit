/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import gsap from 'gsap';
import { MarqueeItem } from '@/shared/types';
import { spacing, fontSize, fontWeight, height, transition } from '@/shared/styles/tokens';
import { dirArrow } from '@/shared/utils/format';
import { sem } from '@/shared/styles/semantic';

interface Props {
  items: MarqueeItem[];
  speed: number;
  onItemClick: (item: MarqueeItem) => void;
}

export const MarqueeTicker = memo(({ items, speed, onItemClick }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  // items를 ref로 캐시해서 리렌더 시 DOM 재생성 방지
  const itemsRef = useRef(items);
  const [rendered, setRendered] = useState(items);

  // 종목 코드 구성이 바뀌었는지 추적 — 바뀌면 애니메이션 재시작 필요
  const codesKey = useMemo(() => items.map(i => i.code).join(','), [items]);
  const prevCodesRef = useRef(codesKey);
  const needsRestartRef = useRef(false);

  useEffect(() => {
    if (codesKey !== prevCodesRef.current) {
      prevCodesRef.current = codesKey;
      needsRestartRef.current = true;
    }
    itemsRef.current = items;
    setRendered(items); // 항상 값은 갱신 (DOM 업데이트)
  }, [items, codesKey]);

  const startAnimation = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // 실제 내용물 1세트의 너비 측정
    const children = track.children;
    const halfCount = Math.floor(children.length / 2);
    let oneSetWidth = 0;
    for (let i = 0; i < halfCount; i++) {
      oneSetWidth += (children[i] as HTMLElement).offsetWidth;
    }

    if (oneSetWidth === 0) return;

    // 기존 tween 제거
    if (tweenRef.current) tweenRef.current.kill();

    // 현재 위치 유지하면서 새 tween
    const currentX = gsap.getProperty(track, 'x') as number || 0;
    // 현재 위치를 0 ~ -oneSetWidth 범위로 정규화
    const normalizedX = ((currentX % oneSetWidth) - oneSetWidth) % oneSetWidth || 0;

    gsap.set(track, { x: normalizedX });

    const duration = oneSetWidth / speed;

    tweenRef.current = gsap.to(track, {
      x: normalizedX - oneSetWidth,
      duration,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x: number) => {
          // 무한 루프: -oneSetWidth 지나면 0으로 리셋
          return ((parseFloat(String(x)) % oneSetWidth) + oneSetWidth) % oneSetWidth - oneSetWidth;
        }),
      },
    });

    if (pausedRef.current) tweenRef.current.pause();
  }, [speed]);

  // 렌더 후 애니메이션 시작 — 코드 구성 변경 시 or 최초 시에만 재시작
  useEffect(() => {
    if (rendered.length === 0) return;
    // 이미 tween이 돌고 있고 코드 구성이 안 바뀌었으면 재시작 안 함 (버벅임 방지)
    if (tweenRef.current && !needsRestartRef.current) return;
    needsRestartRef.current = false;
    const id = requestAnimationFrame(() => startAnimation());
    return () => cancelAnimationFrame(id);
  }, [rendered, startAnimation]);

  // 속도 변경 시 재시작
  useEffect(() => {
    if (rendered.length > 0) startAnimation();
  }, [speed, startAnimation]);

  // pause/resume
  useEffect(() => {
    pausedRef.current = paused;
    if (tweenRef.current) {
      paused ? tweenRef.current.pause() : tweenRef.current.resume();
    }
  }, [paused]);

  // cleanup
  useEffect(() => () => { tweenRef.current?.kill(); }, []);

  const tripled = useMemo(() => [...rendered, ...rendered, ...rendered], [rendered]);

  if (rendered.length === 0) {
    return (
      <div css={s.container}>
        <span css={s.loading}>시장지표 로딩중...</span>
      </div>
    );
  }

  return (
    <div
      css={s.container}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={trackRef} css={s.track}>
        {tripled.map((item, i) => (
          <div key={`${item.code}-${i}`} css={s.item} onClick={() => onItemClick(item)}>
            <span css={s.name}>{item.name}</span>
            <span css={s.value}>
              {item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span css={s.change(item.changeDirection)}>
              {dirArrow(item.changeDirection) || '─'}
              {Math.abs(item.changePercent).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const s = {
  container: css`
    height: 36px; overflow: hidden; background: ${sem.surface.marquee};
    display: flex; align-items: center; cursor: pointer; flex-shrink: 0;
  `,
  loading: css`font-size: ${fontSize.md}px; color: ${sem.text.tertiary}; padding: 0 ${spacing.lg}px;`,
  track: css`display: flex; white-space: nowrap; will-change: transform;`,
  item: css`
    display: flex; align-items: center; gap: ${spacing.md}px; padding: 0 ${spacing.xl}px;
    flex-shrink: 0; height: ${height.control}px; transition: background ${transition.fast};
    &:hover { background: ${sem.bg.elevated}; }
  `,
  name: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.secondary};`,
  value: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  change: (dir: 'up' | 'down' | 'flat') => css`
    font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums;
    color: ${dir === 'up' ? sem.feedback.up : dir === 'down' ? sem.feedback.down : sem.feedback.flat};
  `,
};
