/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { FiCheck, FiAlertCircle, FiInfo, FiTrash2, FiCopy } from 'react-icons/fi';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, height, zIndex , sp } from '@/shared/styles/tokens';

type ToastType = 'success' | 'error' | 'info' | 'delete' | 'copy';

interface ToastItem { id: number; message: string; type: ToastType; }

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  /** 새로고침 결과 알림 — `{label}을 새로 불러왔어요` / `{label}을 불러오지 못했어요` */
  refreshResult: (ok: boolean, label: string) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {}, refreshResult: () => {} });

export const useToast = () => useContext(ToastContext);

const ICON: Record<ToastType, { icon: ReactNode; color: string; glow: string }> = {
  success: { icon: <FiCheck size={15} />, color: sem.action.success, glow: sem.action.successTint },
  error: { icon: <FiAlertCircle size={15} />, color: sem.action.danger, glow: sem.action.dangerTint },
  info: { icon: <FiInfo size={15} />, color: sem.action.primary, glow: sem.action.primaryTint },
  delete: { icon: <FiTrash2 size={15} />, color: sem.action.danger, glow: sem.action.dangerTint },
  copy: { icon: <FiCopy size={15} />, color: sem.action.primary, glow: sem.action.primaryTint },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts([{ id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
  }, []);

  const refreshResult = useCallback((ok: boolean, label: string) => {
    show(
      ok ? `${label}을 새로 불러왔어요` : `${label}을 불러오지 못했어요`,
      ok ? 'success' : 'error',
    );
  }, [show]);

  const hasToasts = toasts.length > 0;
  const glowColor = hasToasts ? ICON[toasts[toasts.length - 1].type].glow : 'transparent';

  return (
    <ToastContext.Provider value={{ show, refreshResult }}>
      {children}
      {ReactDOM.createPortal(
        <>
          {hasToasts && <div css={s.glow} style={{ background: `radial-gradient(ellipse at 50% 0%, ${glowColor} 0%, transparent 70%)` }} />}

          <div css={s.container}>
            {toasts.map(t => {
              const { icon, color } = ICON[t.type];
              return (
                <div key={t.id} css={s.toast}>
                  <span css={s.icon} style={{ color }}>{icon}</span>
                  <span css={s.message}>{t.message}</span>
                </div>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

const slideDown = keyframes`
  0% { opacity: 0; transform: translateY(-12px); }
  8% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
`;

const glowFade = keyframes`
  0% { opacity: 0; }
  8% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
`;

const s = {
  glow: css`
    position: fixed; top: 0; left: 0; right: 0; height: 120px;
    z-index: 9999; pointer-events: none;
    animation: ${glowFade} 2.4s ease forwards;
  `,
  container: css`
    position: fixed; top: ${height.nav}px; left: 50%; transform: translateX(-50%);
    z-index: 10000; display: flex; flex-direction: column; align-items: center; gap: ${spacing.md}px;
    pointer-events: none;
  `,
  toast: css`
    display: flex; align-items: center; gap: ${sp('md', 'xs')};
    background: ${sem.surface.popover}; color: ${sem.text.popover};
    padding: ${sp('md', 'xs')} 18px; border-radius: ${radius['2xl']}px;
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold};
    box-shadow: ${sem.shadow.popover};
    animation: ${slideDown} 2.4s ease forwards;
  `,
  icon: css`
    display: flex; align-items: center; flex-shrink: 0;
  `,
  message: css`
    white-space: nowrap;
  `,
};
