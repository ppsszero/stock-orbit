/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useRef, createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { Modal } from './Modal';

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
      <ConfirmModal state={state} onResult={handle} />
    </ConfirmContext.Provider>
  );
};

const ConfirmModal = ({ state, onResult }: {
  state: { opts: ConfirmOptions; resolve: (v: boolean) => void } | null;
  onResult: (v: boolean) => void;
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // 모달이 새로 열릴 때 확인 버튼에 포커스
  useEffect(() => {
    if (state) {
      const id = setTimeout(() => confirmBtnRef.current?.focus(), 80);
      return () => clearTimeout(id);
    }
  }, [state]);

  const open = !!state;
  const opts = state?.opts;

  return (
    <Modal open={open} onClose={() => onResult(false)}>
      <Modal.Overlay />
      <Modal.Content style={{ maxWidth: 280 }}>
        <div css={s.body} role="alertdialog">
          {opts && <div css={s.title}>{opts.title}</div>}
          {opts?.message && <div css={s.message}>{opts.message}</div>}
          {opts?.hideCancel ? (
            <Modal.CTA ref={confirmBtnRef}
              variant={opts.danger ? 'danger' : 'primary'}
              onClick={() => onResult(true)}>
              {opts.confirmText || '확인'}
            </Modal.CTA>
          ) : (
            <Modal.Actions>
              <Modal.CTA variant="secondary" onClick={() => onResult(false)}>
                {opts?.cancelText || '취소'}
              </Modal.CTA>
              <Modal.CTA ref={confirmBtnRef}
                variant={opts?.danger ? 'danger' : 'primary'}
                onClick={() => onResult(true)}>
                {opts?.confirmText || '확인'}
              </Modal.CTA>
            </Modal.Actions>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};

const s = {
  body: css`
    padding: ${spacing['2xl']}px ${spacing.xl}px ${spacing.xl}px;
    display: flex; flex-direction: column;
  `,
  title: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    text-align: center; margin-bottom: ${spacing.md}px;
  `,
  message: css`
    font-size: ${fontSize.base}px; color: ${sem.text.secondary};
    text-align: center; line-height: 1.5;
    white-space: pre-line;
  `,
};
