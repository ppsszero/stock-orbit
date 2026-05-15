/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { fontSize, fontWeight, radius, spacing, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Item<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  items: Item<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'underline' | 'pill';
  size?: 'md' | 'sm';
  /** 아이템이 넘치면 가로 스크롤 (scrollbar는 숨김). 기본 false */
  fluid?: boolean;
  /** 아이템 정렬. 기본 'left' */
  align?: 'left' | 'center' | 'between' | 'end';
  /** 각 아이템 내부 텍스트 정렬. 'center' 시 자동 균등 너비. 기본 'left' */
  itemAlign?: 'left' | 'center';
}

// 시트 내 페이지/뷰 전환용 탭.
// SegmentedControl과 의미 분리: 옵션 선택은 SegmentedControl, 페이지 전환은 Tabs.
// variant
//   underline — 메인 탭. 풀폭 border-bottom + GSAP 슬라이딩 indicator + click pulse.
//   pill      — 서브 탭. active만 pill 배경.
export const Tabs = <T extends string>({
  items, value, onChange, variant = 'underline', size = 'md',
  fluid = false, align = 'left', itemAlign = 'left',
}: Props<T>) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const mountedRef = useRef(false);
  // RO 콜백에서 최신값 참조용 (RO 자체는 mount 시 한 번만 생성)
  const valueRef = useRef(value);
  const itemAlignRef = useRef(itemAlign);
  valueRef.current = value;
  itemAlignRef.current = itemAlign;

  // active 변경 시 indicator 슬라이딩 — 텍스트(span) 너비 기준
  useLayoutEffect(() => {
    if (variant !== 'underline') return;
    const activeBtn = btnRefs.current[value];
    const activeLabel = labelRefs.current[value];
    const indicator = indicatorRef.current;
    if (!activeBtn || !indicator) return;

    // itemAlign=center면 균등 너비 button 영역 전체에 underline,
    // left면 텍스트(span) 폭만큼만
    const target = itemAlign === 'center' || !activeLabel
      ? { x: activeBtn.offsetLeft, width: activeBtn.offsetWidth }
      : { x: activeBtn.offsetLeft + activeLabel.offsetLeft, width: activeLabel.offsetWidth };

    if (!mountedRef.current) {
      // 초기 마운트: 점프 없이 즉시 배치
      gsap.set(indicator, target);
      mountedRef.current = true;
    } else {
      gsap.to(indicator, { ...target, duration: 0.3, ease: 'power2.out' });
    }
  }, [value, variant, items, itemAlign]);

  // 컨테이너 리사이즈 / 폰트 로드 시 indicator 재배치 (애니메이션 없이 즉시)
  // RO를 mount 시 한 번만 생성해 value 변경 시 gsap.to 애니메이션과 타이밍 충돌 방지.
  useEffect(() => {
    if (variant !== 'underline') return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    // ResizeObserver는 observe 직후 초기 콜백 1회를 발화함 — skip 처리.
    let initialSkipped = false;
    const reposition = () => {
      if (!initialSkipped) { initialSkipped = true; return; }
      const v = valueRef.current;
      const ia = itemAlignRef.current;
      const activeBtn = btnRefs.current[v];
      const activeLabel = labelRefs.current[v];
      const indicator = indicatorRef.current;
      if (!activeBtn || !indicator) return;
      const target = ia === 'center' || !activeLabel
        ? { x: activeBtn.offsetLeft, width: activeBtn.offsetWidth }
        : { x: activeBtn.offsetLeft + activeLabel.offsetLeft, width: activeLabel.offsetWidth };
      gsap.set(indicator, target);
    };

    const ro = new ResizeObserver(reposition);
    ro.observe(wrap);

    // 폰트 늦게 로드되어 텍스트 너비가 변하는 경우 — initial skip 우회해서 직접 호출
    document.fonts?.ready?.then(() => {
      const v = valueRef.current;
      const ia = itemAlignRef.current;
      const activeBtn = btnRefs.current[v];
      const activeLabel = labelRefs.current[v];
      const indicator = indicatorRef.current;
      if (!activeBtn || !indicator) return;
      const target = ia === 'center' || !activeLabel
        ? { x: activeBtn.offsetLeft, width: activeBtn.offsetWidth }
        : { x: activeBtn.offsetLeft + activeLabel.offsetLeft, width: activeLabel.offsetWidth };
      gsap.set(indicator, target);
    }).catch(() => {});

    return () => ro.disconnect();
  }, [variant]);

  const handleClick = (key: T, btn: HTMLButtonElement) => {
    if (key !== value) {
      // click pulse — 미세하고 짧게
      gsap.fromTo(btn,
        { scale: 1 },
        { scale: 0.97, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' }
      );
    }
    onChange(key);
  };

  return (
    <div ref={wrapRef} css={s.wrap(variant, fluid, align)} role="tablist">
      {items.map(item => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => { btnRefs.current[item.key] = el; }}
            css={s.btn(variant, size, active, itemAlign)}
            role="tab"
            aria-selected={active}
            onClick={(e) => handleClick(item.key, e.currentTarget)}
          >
            <span ref={(el) => { labelRefs.current[item.key] = el; }} css={s.label}>{item.label}</span>
          </button>
        );
      })}
      {variant === 'underline' && <div ref={indicatorRef} css={s.indicator} />}
    </div>
  );
};

const s = {
  wrap: (variant: 'underline' | 'pill', fluid: boolean, align: 'left' | 'center' | 'between' | 'end') => css`
    display: flex;
    flex-shrink: 0;
    position: relative;
    justify-content: ${align === 'center' ? 'center' : align === 'between' ? 'space-between' : align === 'end' ? 'flex-end' : 'flex-start'};
    ${fluid ? `
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    ` : ''}
    ${variant === 'underline' ? `
      padding: 0 ${spacing.xl}px;
      gap: ${spacing.xl}px;
      border-bottom: 1px solid ${sem.border.subtle};
      margin-bottom: ${spacing.lg}px;
    ` : `
      gap: ${spacing.xs}px;
    `}
  `,
  btn: (variant: 'underline' | 'pill', size: 'md' | 'sm', active: boolean, itemAlign: 'left' | 'center') => css`
    border: none;
    font-family: inherit;
    font-size: ${size === 'sm' ? fontSize.md : fontSize.lg}px;
    font-weight: ${active ? fontWeight.bold : fontWeight.medium};
    cursor: pointer;
    transition: color ${transition.normal}, background ${transition.normal};
    color: ${active ? sem.text.primary : sem.text.tertiary};
    transform-origin: center;
    flex-shrink: 0;
    white-space: nowrap;
    ${itemAlign === 'center' ? `
      flex: 1 0 0;
      flex-shrink: 0;
      text-align: center;
    ` : ''}
    ${variant === 'underline' ? `
      position: relative;
      background: transparent;
      padding: ${size === 'sm' ? spacing.sm : spacing.md}px 0 ${size === 'sm' ? spacing.md : spacing.xl}px;
      &:hover { color: ${sem.text.primary}; }
    ` : `
      padding: ${size === 'sm' ? spacing.md : spacing.lg}px ${size === 'sm' ? spacing.lg : spacing.xl}px;
      border-radius: ${radius.lg}px;
      background: ${active ? sem.bg.surface : 'transparent'};
      &:hover { background: ${sem.bg.surface}; }
    `}
  `,
  label: css`
    display: inline-block;
  `,
  indicator: css`
    position: absolute;
    left: 0;
    bottom: -1px;
    height: 2px;
    background: ${sem.text.primary};
    border-radius: 1px;
    pointer-events: none;
    will-change: transform, width;
  `,
};
