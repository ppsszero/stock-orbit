/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useRef, useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, zIndex } from '@/shared/styles/tokens';

let activeHide: (() => void) | null = null;

interface Props {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom';
  delay?: number;
  display?: 'inline-flex' | 'flex' | 'block';
}

export const Tooltip = ({ content, children, position = 'bottom', delay = 400, display }: Props) => {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ left: 0, top: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const mouseY = useRef(0);
  const animDir = useRef(position);

  const handleMouseMove = (e: React.MouseEvent) => { mouseY.current = e.clientY; };

  useEffect(() => {
    if (!visible || !tipRef.current || !wrapRef.current) return;
    const tip = tipRef.current;
    // display: contents 일 때 래퍼의 bounding box가 0이 되므로 첫 자식 요소의 위치를 사용
    const anchorEl = (wrapRef.current.firstElementChild as HTMLElement | null) || wrapRef.current;
    const wrap = anchorEl.getBoundingClientRect();
    const tipH = tip.offsetHeight;
    const tipW = tip.offsetWidth;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const pad = 6;

    let x = wrap.left + wrap.width / 2 - tipW / 2;
    x = Math.max(pad, Math.min(x, winW - tipW - pad));

    // position="top"인 경우 요소 기준 고정 위치 (delete 버튼 등 가리지 않도록).
    // 나머지는 마우스 위치 기준 따라다니기.
    const isTopAnchored = position === 'top';
    const topAnchor = isTopAnchored ? wrap.top : (mouseY.current || wrap.top + wrap.height / 2);
    const bottomAnchor = isTopAnchored ? wrap.bottom : (mouseY.current || wrap.bottom);
    const above = topAnchor - tipH - 10;
    const below = bottomAnchor + 16;

    let y: number;
    if (position === 'top' && above > pad) {
      y = above; animDir.current = 'top';
    } else if (below + tipH < winH - pad) {
      y = below; animDir.current = 'bottom';
    } else if (above > pad) {
      y = above; animDir.current = 'top';
    } else {
      y = Math.max(pad, winH - tipH - pad);
      animDir.current = 'bottom';
    }

    setStyle({ left: x, top: y });

    gsap.fromTo(tip,
      { opacity: 0, y: animDir.current === 'top' ? 5 : -5, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: 'power2.out' }
    );
  }, [visible, position]);

  const hideImmediate = () => {
    clearTimeout(timer.current);
    if (tipRef.current) gsap.killTweensOf(tipRef.current);
    setVisible(false);
  };

  const show = () => {
    if (activeHide && activeHide !== hideImmediate) activeHide();
    activeHide = hideImmediate;
    timer.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timer.current);
    if (activeHide === hideImmediate) activeHide = null;
    if (tipRef.current) {
      gsap.to(tipRef.current, {
        opacity: 0, duration: 0.08, ease: 'power2.in',
        onComplete: () => setVisible(false),
      });
    } else {
      setVisible(false);
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const wrapStyle = display
    ? css`display: ${display};`
    : css`display: contents; & > * { pointer-events: auto; }`;

  return (
    <div ref={wrapRef} onMouseEnter={show} onMouseLeave={hide} onMouseMove={handleMouseMove} css={wrapStyle}>
      {children}
      {visible && ReactDOM.createPortal(
        <div ref={tipRef} css={s.tip} style={style}>{content}</div>,
        document.body
      )}
    </div>
  );
};

const s = {
  tip: css`
    position: fixed; z-index: ${zIndex.tooltip};
    padding: ${spacing.md}px ${spacing.lg}px; border-radius: ${radius.xl}px;
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold}; line-height: 1.6;
    white-space: pre-line; max-width: 260px; width: max-content;
    pointer-events: none; will-change: transform, opacity;
    background: ${sem.surface.popover}; color: ${sem.surface.popoverText};
    box-shadow: ${sem.shadow.popover};
  `,
};
