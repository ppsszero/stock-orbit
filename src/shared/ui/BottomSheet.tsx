/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { spacing, fontSize, fontWeight, radius, transition, zIndex } from '@/shared/styles/tokens';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { sem } from '@/shared/styles/semantic';

/**
 * BottomSheet — 화면 하단에서 슬라이드 업되는 모달.
 *
 * 공통 패턴:
 * - portal로 document.body에 렌더 → 어떤 컨테이너 안에서든 화면 전체 덮음
 * - 핸들 잡고 드래그하면 dismiss (80px threshold)
 * - 딤 클릭 / ESC / 마우스 뒤로(4번) 로도 close
 * - header / headerDescription / cta 슬롯 (compound 패턴)
 *
 * 사용:
 *   <BottomSheet open={open} onClose={close}
 *     header={<BottomSheet.Header>제목</BottomSheet.Header>}
 *     headerDescription={<BottomSheet.HeaderDescription>부제</BottomSheet.HeaderDescription>}
 *     cta={<BottomSheet.CTA onClick={...}>액션</BottomSheet.CTA>}>
 *     <리스트 또는 컨텐츠 />
 *   </BottomSheet>
 */

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  header?: ReactNode;
  headerDescription?: ReactNode;
  cta?: ReactNode;
  children?: ReactNode;
  /** 시트의 최대 높이 (vh%, 기본 75) */
  maxHeightVH?: number;
}

const DISMISS_THRESHOLD = 80;

interface BottomSheetComponent extends React.FC<BottomSheetProps> {
  Header: React.FC<{ children: ReactNode }>;
  HeaderDescription: React.FC<{ children: ReactNode }>;
  CTA: React.FC<{ onClick: () => void; children: ReactNode }>;
}

const BottomSheetBase: React.FC<BottomSheetProps> = ({
  open, onClose, header, headerDescription, cta, children, maxHeightVH = 75,
}) => {
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  useBackAction(open, onClose);

  // mount 후 한 프레임 뒤 슬라이드 인 (transform 0 → translateY(0))
  useEffect(() => {
    if (open) {
      setDrag(0);
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    setMounted(false);
  }, [open]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const startY = e.clientY;
    setDragging(true);
    const onMove = (mv: PointerEvent) => {
      const dy = mv.clientY - startY;
      setDrag(Math.max(0, dy));
    };
    const onUp = (up: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragging(false);
      const dy = up.clientY - startY;
      if (dy > DISMISS_THRESHOLD) onClose();
      else setDrag(0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!open) return null;

  // 슬라이드 인: mounted 전엔 translateY(100%), 후엔 translateY(drag).
  const translateY = mounted ? `${drag}px` : '100%';

  return ReactDOM.createPortal(
    <div css={s.overlay} onClick={onClose}>
      <div
        css={s.sheet}
        style={{
          maxHeight: `${maxHeightVH}vh`,
          transform: `translateY(${translateY})`,
          transition: dragging ? 'none' : `transform ${transition.normal}`,
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true">
        <div css={s.handleWrap} onPointerDown={handlePointerDown}>
          <div css={s.handle} />
        </div>
        {(header || headerDescription) && (
          <div css={s.headerWrap}>
            {header}
            {headerDescription}
          </div>
        )}
        <div css={s.body}>{children}</div>
        {cta && <div css={s.ctaWrap}>{cta}</div>}
      </div>
    </div>,
    document.body
  );
};

const Header: React.FC<{ children: ReactNode }> = ({ children }) => (
  <h2 css={s.title}>{children}</h2>
);

const HeaderDescription: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={s.description}>{children}</div>
);

const CTA: React.FC<{ onClick: () => void; children: ReactNode }> = ({ onClick, children }) => (
  <button type="button" css={s.cta} onClick={onClick}>
    {children}
  </button>
);

export const BottomSheet = BottomSheetBase as BottomSheetComponent;
BottomSheet.Header = Header;
BottomSheet.HeaderDescription = HeaderDescription;
BottomSheet.CTA = CTA;

const s = {
  overlay: css`
    position: fixed; inset: 0;
    z-index: ${zIndex.modal};
    background: ${sem.overlay.dim};
    display: flex; align-items: flex-end;
  `,
  sheet: css`
    width: 100%;
    background: ${sem.bg.base};
    border-top-left-radius: ${radius['2xl']}px;
    border-top-right-radius: ${radius['2xl']}px;
    display: flex; flex-direction: column;
    box-shadow: ${sem.shadow.popover};
    will-change: transform;
  `,
  handleWrap: css`
    display: flex; justify-content: center;
    padding: ${spacing.md}px 0 ${spacing.sm}px;
    cursor: grab;
    touch-action: none;
    flex-shrink: 0;
    &:active { cursor: grabbing; }
  `,
  handle: css`
    width: 36px; height: 4px;
    border-radius: 2px;
    background: ${sem.border.strong};
  `,
  headerWrap: css`
    padding: ${spacing.lg}px ${spacing.xl}px ${spacing.lg}px;
    display: flex; flex-direction: column; gap: ${spacing.sm}px;
    flex-shrink: 0;
  `,
  title: css`
    margin: 0;
    font-size: ${fontSize['2xl']}px;
    font-weight: ${fontWeight.bold};
    color: ${sem.text.primary};
    line-height: 1.3;
  `,
  description: css`
    font-size: ${fontSize.sm}px;
    color: ${sem.text.secondary};
    line-height: 1.5;
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 0 ${spacing.xl}px;
  `,
  ctaWrap: css`
    flex-shrink: 0;
    padding: ${spacing.lg}px ${spacing.xl}px ${spacing.xl}px;
  `,
  cta: css`
    width: 100%;
    padding: ${spacing.lg}px;
    display: flex; align-items: center; justify-content: center; gap: ${spacing.sm}px;
    border: none; border-radius: ${radius.lg}px;
    background: ${sem.action.primary};
    color: ${sem.text.inverse};
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold};
    font-family: inherit;
    cursor: pointer;
    transition: filter ${transition.fast};
    &:hover { filter: brightness(1.08); }
  `,
};
