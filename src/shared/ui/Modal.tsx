/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { CSSProperties, ReactNode, createContext, forwardRef, useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { spacing, fontSize, fontWeight, radius, transition, zIndex } from '@/shared/styles/tokens';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { sem } from '@/shared/styles/semantic';

/**
 * Modal — 중요한 정보 표시·확인 액션 유도용 모달.
 *
 * 공통 패턴 (당근 디자인 시스템 영감):
 * - portal로 document.body 렌더 → 어떤 컨테이너 안에 있든 화면 전체 덮음
 * - compound: Modal.Overlay (배경 딤) + Modal.Content (본문) + Modal.CTA (하단 액션)
 * - Overlay 클릭 / ESC / 마우스 뒤로 → onClose 자동
 * - Overlay에 onClick 주면 default close 대신 그 콜백만 호출 (예: "저장하지 않고 나가시겠습니까?")
 * - 접근성: role="dialog" + aria-modal, tabIndex, aria-hidden(overlay)
 *
 * 사용:
 *   <Modal open={open} onClose={close}>
 *     <Modal.Overlay />
 *     <Modal.Content>
 *       ...내용...
 *       <Modal.CTA onClick={close}>확인</Modal.CTA>
 *     </Modal.Content>
 *   </Modal>
 */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

interface ModalContextValue {
  onClose: () => void;
}
const ModalContext = createContext<ModalContextValue | null>(null);

type CTAVariant = 'primary' | 'secondary' | 'danger';

interface CTAProps {
  onClick: () => void;
  children: ReactNode;
  variant?: CTAVariant;
  disabled?: boolean;
}

interface ModalComponent extends React.FC<ModalProps> {
  Overlay: React.FC<{ onClick?: () => void }>;
  Content: React.FC<{ children: ReactNode; style?: CSSProperties; className?: string }>;
  CTA: React.ForwardRefExoticComponent<CTAProps & React.RefAttributes<HTMLButtonElement>>;
  Actions: React.FC<{ children: ReactNode }>;
}

const ModalBase: React.FC<ModalProps> = ({ open, onClose, children }) => {
  const [mounted, setMounted] = useState(false);

  useBackAction(open, onClose);

  // 페이드/스케일 인 — open 직후 한 프레임 뒤에 mounted=true
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(id);
    }
    setMounted(false);
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <ModalContext.Provider value={{ onClose }}>
      <div css={s.outer} data-mounted={mounted}>{children}</div>
    </ModalContext.Provider>,
    document.body
  );
};
ModalBase.displayName = 'Modal';

const Overlay: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const ctx = useContext(ModalContext);
  const handle = () => (onClick ? onClick() : ctx?.onClose());
  return <div css={s.overlay} onClick={handle} role="button" aria-hidden="true" />;
};
Overlay.displayName = 'Modal.Overlay';

const Content: React.FC<{ children: ReactNode; style?: CSSProperties; className?: string }> = ({ children, style, className }) => (
  <div css={s.content} style={style} className={className}
    role="dialog" aria-modal="true" tabIndex={0}
    onClick={e => e.stopPropagation()}>
    {children}
  </div>
);
Content.displayName = 'Modal.Content';

const CTA = forwardRef<HTMLButtonElement, CTAProps>(
  ({ onClick, children, variant = 'primary', disabled = false }, ref) => (
    <button ref={ref} type="button" css={s.cta(variant)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
);
CTA.displayName = 'Modal.CTA';

const Actions: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={s.actions}>{children}</div>
);
Actions.displayName = 'Modal.Actions';

export const Modal = ModalBase as ModalComponent;
Modal.Overlay = Overlay;
Modal.Content = Content;
Modal.CTA = CTA;
Modal.Actions = Actions;

const s = {
  outer: css`
    position: fixed; inset: 0;
    z-index: ${zIndex.modal};
    display: flex; align-items: center; justify-content: center;
    padding: ${spacing['3xl']}px;
    opacity: 0;
    transition: opacity ${transition.normal};
    &[data-mounted="true"] { opacity: 1; }
  `,
  overlay: css`
    position: absolute; inset: 0;
    background: ${sem.overlay.dim};
    cursor: default;
  `,
  content: css`
    position: relative;
    background: ${sem.surface.card};
    border-radius: ${radius['2xl']}px;
    width: 100%; max-width: 360px;
    max-height: 85vh;
    display: flex; flex-direction: column;
    overflow: hidden;
    box-shadow: ${sem.shadow.popover};
    transform: scale(0.96);
    transition: transform ${transition.normal};
    [data-mounted="true"] & { transform: scale(1); }
    &:focus { outline: none; }
  `,
  cta: (variant: CTAVariant) => {
    const bg = variant === 'danger' ? sem.action.danger
             : variant === 'secondary' ? sem.bg.surface
             : sem.action.primary;
    const fg = variant === 'secondary' ? sem.text.secondary : sem.text.inverse;
    return css`
      flex: 1;
      width: 100%;
      padding: ${spacing.lg}px;
      border: none; border-radius: ${radius.lg}px;
      background: ${bg};
      color: ${fg};
      font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold};
      font-family: inherit;
      cursor: pointer;
      transition: filter ${transition.fast}, background ${transition.fast};
      &:hover:not(:disabled) {
        ${variant === 'secondary' ? `background: ${sem.bg.elevated};` : 'filter: brightness(1.08);'}
      }
      &:disabled { opacity: 0.5; cursor: default; }
    `;
  },
  actions: css`
    display: flex; gap: ${spacing.md}px;
    margin-top: ${spacing['xl']}px;
  `,
};
