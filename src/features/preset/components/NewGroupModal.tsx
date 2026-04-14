/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { spacing, fontSize, fontWeight, radius, zIndex, transition , sp } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  open: boolean;
  mode?: 'add' | 'rename';
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const SUGGESTIONS = ['국내', '해외', '배당주', '성장주', '장기', '단기', 'ETF', '기술주', '가치주', '테마주'];

export const NewGroupModal = ({ open, mode = 'add', initialName = '', onConfirm, onCancel }: Props) => {
  const [name, setName] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRename = mode === 'rename';

  useEffect(() => {
    if (!open) return;
    setName(isRename ? initialName : '');
    setTimeout(() => inputRef.current?.focus(), 150);
    if (overlayRef.current) gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.15 });
    if (modalRef.current) gsap.fromTo(modalRef.current,
      { opacity: 0, scale: 0.95, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out' }
    );
  }, [open]);

  const close = (result: string | null) => {
    if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 0, duration: 0.1 });
    if (modalRef.current) gsap.to(modalRef.current, {
      opacity: 0, scale: 0.97, y: 4, duration: 0.12, ease: 'power2.in',
      onComplete: () => result ? onConfirm(result) : onCancel(),
    });
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) close(trimmed);
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div ref={overlayRef} css={s.overlay} onClick={() => close(null)}>
      <div ref={modalRef} css={s.modal} onClick={e => e.stopPropagation()}>
        <div css={s.title}>{isRename ? '그룹 이름 변경' : '어떤 주제의 그룹을 만들까요?'}</div>
        <input
          ref={inputRef}
          css={s.input}
          placeholder="그룹명을 입력하세요"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') close(null);
          }}
          maxLength={20}
        />
        {!isRename && (
          <div css={s.badges}>
            {SUGGESTIONS.map(tag => (
              <button key={tag} css={s.badge} onClick={() => setName(tag)}>
                {tag}
              </button>
            ))}
          </div>
        )}
        <div css={s.actions}>
          <button css={s.cancelBtn} onClick={() => close(null)}>취소</button>
          <button css={s.confirmBtn} disabled={!name.trim()} onClick={handleSubmit}>
            {isRename ? '변경' : '그룹 추가'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const s = {
  overlay: css`
    position: fixed; inset: 0; z-index: ${zIndex.modal};
    background: rgba(0,0,0,0.5); border-radius: ${radius['2xl']}px;
    display: flex; align-items: center; justify-content: center;
    padding: ${spacing['4xl']}px;
  `,
  modal: css`
    background: ${sem.surface.card}; border-radius: 14px;
    width: 100%; max-width: 300px;
    padding: ${spacing['3xl']}px ${spacing['2xl']}px ${spacing.xl}px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.3);
    border: 1px solid ${sem.border.default};
  `,
  title: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    text-align: center; margin-bottom: ${spacing.xl}px;
  `,
  input: css`
    width: 100%; padding: ${sp('md', 'xs')} 14px; border: 1px solid ${sem.border.default};
    border-radius: ${radius.xl}px; background: ${sem.bg.surface}; color: ${sem.text.primary};
    font-size: ${fontSize.lg}px; outline: none; box-sizing: border-box;
    &::placeholder { color: ${sem.text.tertiary}; }
    &:focus { border-color: ${sem.action.primary}; }
  `,
  badges: css`
    display: flex; flex-wrap: wrap; gap: ${spacing.md}px;
    margin-top: ${spacing.lg}px;
  `,
  badge: css`
    padding: ${spacing.sm}px 10px; border: 1px solid ${sem.border.subtle};
    border-radius: ${radius.full}px; background: ${sem.bg.elevated};
    color: ${sem.text.secondary}; font-size: ${fontSize.md}px; font-weight: ${fontWeight.medium};
    cursor: pointer; transition: all ${transition.fast};
    &:hover { background: ${sem.action.primaryTint}; color: ${sem.action.primary}; border-color: ${sem.action.primaryStrong}; }
  `,
  actions: css`
    display: flex; gap: ${spacing.md}px; margin-top: ${sp('xl', 'xs')};
  `,
  cancelBtn: css`
    flex: 1; padding: ${sp('md', 'xs')}; border: none;
    background: ${sem.bg.surface}; color: ${sem.text.secondary};
    border-radius: ${radius.xl}px; font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    cursor: pointer; transition: background ${transition.fast};
    &:hover { background: ${sem.bg.elevated}; }
  `,
  confirmBtn: css`
    flex: 1; padding: ${sp('md', 'xs')}; border: none;
    background: ${sem.action.primary}; color: ${sem.text.inverse};
    border-radius: ${radius.xl}px; font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    cursor: pointer; transition: opacity ${transition.fast};
    &:hover { opacity: 0.9; }
    &:disabled { opacity: 0.4; cursor: default; }
  `,
};
