/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import gsap from 'gsap';
import { MarqueeItem } from '@/shared/types';
import { spacing, fontSize, fontWeight, height, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { makeDirectionalChange } from '@/shared/styles/sharedStyles';
import { groupMarqueeItems } from '@/features/marquee/utils/groupMarqueeItems';
import { formatMarqueeValue, formatMarqueePercent } from '@/features/marquee/utils/formatMarqueeValue';

interface Props {
  items: MarqueeItem[];
  speed: number;
  onItemClick: (item: MarqueeItem) => void;
}

export const MarqueeTicker = memo(({ items: rawItems, speed, onItemClick }: Props) => {
  // 시장지표 시트 표기 순서로 정렬: 주요지수 → 환율 → 에너지 → 금속
  const items = useMemo(() => {
    const g = groupMarqueeItems(rawItems);
    return [...g.index, ...g.fx, ...g.energy, ...g.metals];
  }, [rawItems]);

  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  // 코드 구성 키 — 종목 추가/삭제 시에만 변경
  const codesKey = useMemo(() => items.map(i => i.code).join(','), [items]);

  // 초기 렌더 + 코드 구성 변경 시에만 DOM 갱신 (tripled 재생성)
  const [renderedCodes, setRenderedCodes] = useState(codesKey);
  const [rendered, setRendered] = useState(items);

  useEffect(() => {
    if (codesKey !== renderedCodes) {
      setRenderedCodes(codesKey);
      setRendered(items);
    }
  }, [codesKey, renderedCodes, items]);

  // 값만 변경 시 DOM을 직접 업데이트 (React 리렌더 없이)
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
    const track = trackRef.current;
    if (!track || codesKey !== renderedCodes) return;

    // 각 아이템 세트를 3번 반복하므로 items.length 단위로 순회
    // DOM 자식 순서: [0]=name, [1]=value, [2]=change
    const len = items.length;
    const children = track.children;
    for (let copy = 0; copy < 3; copy++) {
      for (let i = 0; i < len; i++) {
        const el = children[copy * len + i] as HTMLElement | undefined;
        if (!el) continue;
        const item = items[i];
        const valueEl = el.children[1] as HTMLElement | undefined;
        const changeEl = el.children[2] as HTMLElement | undefined;
        if (valueEl) valueEl.textContent = formatMarqueeValue(item);
        if (changeEl) {
          changeEl.textContent = formatMarqueePercent(item);
          changeEl.style.color = item.changeDirection === 'up' ? 'var(--c-up)' : item.changeDirection === 'down' ? 'var(--c-down)' : 'var(--c-flat)';
        }
      }
    }
  }, [items, codesKey, renderedCodes]);

  const startAnimation = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const children = track.children;
    const halfCount = Math.floor(children.length / 2);
    let oneSetWidth = 0;
    for (let i = 0; i < halfCount; i++) {
      oneSetWidth += (children[i] as HTMLElement).offsetWidth;
    }

    if (oneSetWidth === 0) return;

    if (tweenRef.current) tweenRef.current.kill();

    const currentX = gsap.getProperty(track, 'x') as number || 0;
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
          return ((parseFloat(String(x)) % oneSetWidth) + oneSetWidth) % oneSetWidth - oneSetWidth;
        }),
      },
    });

    if (pausedRef.current) tweenRef.current.pause();
  }, [speed]);

  // 코드 구성 변경 시 or 최초 시에만 애니메이션 시작
  useEffect(() => {
    if (rendered.length === 0) return;
    const id = requestAnimationFrame(() => startAnimation());
    return () => cancelAnimationFrame(id);
  }, [renderedCodes, startAnimation]); // rendered 대신 renderedCodes — 값 변경 시 재시작 안 함

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
          <div key={`${item.code}-${i}`} css={s.item} onClick={() => onItemClick(itemsRef.current[i % items.length])}>
            <span css={s.name}>{item.name}</span>
            <span css={s.value}>
              {formatMarqueeValue(item)}
            </span>
            <span css={s.change[item.changeDirection]}>
              {formatMarqueePercent(item)}
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
    flex-shrink: 0; height: ${height.control}px;
    transition: background ${transition.fast};
    &:hover { background: ${sem.bg.elevated}; }
  `,
  name: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.secondary};`,
  value: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  change: makeDirectionalChange(fontSize.xs),
};
