/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useRef, useEffect, createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition, zIndex, shadow, sp, opacity } from '@/shared/styles/tokens';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  /** 취소 버튼 숨김 (안내 전용 다이얼로그에 사용) */
  hideCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider');
  return ctx.confirm;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => setState({ opts, resolve }));
  }, []);

  const handle = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && ReactDOM.createPortal(
        <ConfirmModal opts={state.opts} onResult={handle} />,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};

const ConfirmModal = ({ opts, onResult }: {
  opts: ConfirmOptions; onResult: (v: boolean) => void;
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overlayRef.current) gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.15 });
    if (modalRef.current) gsap.fromTo(modalRef.current,
      { opacity: 0, scale: 0.95, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' }
    );
    // 모달 열리면 확인 버튼에 포커스
    modalRef.current?.querySelector<HTMLButtonElement>('button:last-child')?.focus();
  }, []);

  // Escape 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const close = (result: boolean) => {
    if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 0, duration: 0.1 });
    if (modalRef.current) gsap.to(modalRef.current, {
      opacity: 0, scale: 0.97, y: 4, duration: 0.12, ease: 'power2.in',
      onComplete: () => onResult(result),
    });
  };

  return (
    <div ref={overlayRef} css={s.overlay} onClick={() => close(false)}>
      <div ref={modalRef} css={s.modal} role="alertdialog" aria-labelledby="confirm-title" onClick={e => e.stopPropagation()}>
        <div css={s.title} id="confirm-title">{opts.title}</div>
        {opts.message && <div css={s.message}>{opts.message}</div>}
        <div css={s.actions}>
          {!opts.hideCancel && (
            <button css={s.cancelBtn} onClick={() => close(false)}>
              {opts.cancelText || '취소'}
            </button>
          )}
          <button css={s.confirmBtn(opts.danger)} onClick={() => close(true)}>
            {opts.confirmText || '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};

const s = {
  overlay: css`
    position: fixed; inset: 0; z-index: ${zIndex.modal};
    background: ${sem.overlay.dim}; border-radius: ${radius['2xl']}px;
    display: flex; align-items: center; justify-content: center;
    padding: ${spacing['4xl']}px;
  `,
  modal: css`
    background: ${sem.surface.card}; border-radius: ${radius['2xl']}px;
    width: 100%; max-width: 280px;
    padding: ${spacing['3xl']}px ${spacing['2xl']}px ${spacing.xl}px;
    box-shadow: ${shadow.lg};
    border: 1px solid ${sem.border.default};
  `,
  title: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    text-align: center; margin-bottom: ${spacing.md}px;
  `,
  message: css`
    font-size: ${fontSize.base}px; color: ${sem.text.secondary};
    text-align: center; line-height: 1.5; margin-bottom: ${sp('xl', 'xs')};
    white-space: pre-line;
  `,
  actions: css`
    display: flex; gap: ${spacing.md}px;
  `,
  cancelBtn: css`
    flex: 1; padding: ${sp('md', 'xs')}; border: none;
    background: ${sem.bg.surface}; color: ${sem.text.secondary};
    border-radius: ${radius.xl}px; font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    font-family: inherit; cursor: pointer; transition: background ${transition.fast};
    &:hover { background: ${sem.bg.elevated}; }
  `,
  confirmBtn: (danger?: boolean) => css`
    flex: 1; padding: ${sp('md', 'xs')}; border: none;
    background: ${danger ? sem.action.danger : sem.action.primary};
    color: ${sem.text.inverse}; border-radius: ${radius.xl}px; font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    font-family: inherit; cursor: pointer; transition: opacity ${transition.fast};
    &:hover { opacity: ${opacity.hover}; }
  `,
};
