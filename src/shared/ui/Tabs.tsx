/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { fontSize, fontWeight, radius, spacing, transition, interaction } from '@/shared/styles/tokens';
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
  /**
   * ARIA 접근성용 id prefix. 지정 시:
   *  - 각 탭 버튼: id=`${id}-tab-${key}`, aria-controls=`${id}-panel-${key}`
   *  - 사용처는 각 패널 div에 `role="tabpanel" id="${id}-panel-${key}" aria-labelledby="${id}-tab-${key}"` 부여 권장.
   *  - 단일 panel 패턴이면 panel id를 `${id}-panel-${value}`로 동적 매칭 가능.
   */
  id?: string;
}

// 시트 내 페이지/뷰 전환용 탭.
// SegmentedControl과 의미 분리: 옵션 선택은 SegmentedControl, 페이지 전환은 Tabs.
// variant
//   underline — 메인 탭. 풀폭 border-bottom + GSAP 슬라이딩 indicator + click pulse.
//   pill      — 서브 탭. active만 pill 배경.
export const Tabs = <T extends string>({
  items, value, onChange, variant = 'underline', size = 'md',
  fluid = false, align = 'left', itemAlign = 'left', id,
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

  // variant 변경 시 (예: pill → underline) indicator를 다시 처음부터 배치
  useLayoutEffect(() => {
    mountedRef.current = false;
  }, [variant]);

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
      // 초기 마운트 / variant 전환: 점프 없이 즉시 배치
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

    // 폰트 늦게 로드되어 텍스트 너비가 변하는 경우 — promise는 cancel 불가하니
    // unmount 후 stale ref 건드리지 않도록 cancelled flag 가드
    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (cancelled) return;
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

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [variant]);

  // fluid 모드: 휠 → 가로 스크롤, 마우스 drag-to-scroll, active 탭 자동 가시화
  useEffect(() => {
    if (!fluid) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let isDown = false, startX = 0, baseScrollLeft = 0, dragged = false;

    const onWheel = (e: WheelEvent) => {
      // 세로 휠 → 가로 스크롤 (스크롤바 숨김 상태에서도 휠로 탐색)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        wrap.scrollLeft += e.deltaY;
      }
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDown = true; dragged = false;
      startX = e.pageX;
      baseScrollLeft = wrap.scrollLeft;
    };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (!dragged && Math.abs(dx) > interaction.dragThreshold) {
        dragged = true;
        wrap.style.cursor = 'grabbing';
      }
      if (dragged) {
        e.preventDefault();
        wrap.scrollLeft = baseScrollLeft - dx;
      }
    };
    const endDrag = () => { isDown = false; wrap.style.cursor = ''; };
    // drag 도중 click 막아 우발 탭 변경 방지
    const onClickCapture = (e: MouseEvent) => {
      if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
    };

    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('mousedown', onDown);
    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseup', endDrag);
    wrap.addEventListener('mouseleave', endDrag);
    wrap.addEventListener('click', onClickCapture, true);

    return () => {
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('mousedown', onDown);
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseup', endDrag);
      wrap.removeEventListener('mouseleave', endDrag);
      wrap.removeEventListener('click', onClickCapture, true);
    };
  }, [fluid]);

  // fluid 모드에서 active 탭이 화면 밖이면 자동 가시화 (외부 value 변경 케이스 대응)
  useEffect(() => {
    if (!fluid) return;
    const activeBtn = btnRefs.current[value];
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [value, fluid]);

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
            id={id ? `${id}-tab-${item.key}` : undefined}
            aria-controls={id ? `${id}-panel-${item.key}` : undefined}
            tabIndex={active ? 0 : -1}
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
