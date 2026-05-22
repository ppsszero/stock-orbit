/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { spacing, fontSize, fontWeight, radius, transition, sp } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { Modal } from '@/shared/ui';

interface Props {
  open: boolean;
  mode?: 'add' | 'rename';
  initialName?: string;
  /** 중복 검사용 — 기존 그룹 이름 목록 (rename 모드에선 자기 자신은 통과) */
  existingNames?: string[];
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const SUGGESTIONS = ['국내', '해외', '배당주', '성장주', '장기', '단기', 'ETF', '기술주', '가치주', '테마주'];

export const NewGroupModal = ({ open, mode = 'add', initialName = '', existingNames, onConfirm, onCancel }: Props) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isRename = mode === 'rename';

  useEffect(() => {
    if (!open) return;
    setName(isRename ? initialName : '');
    // Modal 페이드 인이 끝나는 시점에 포커스
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, isRename, initialName]);

  // 중복 검사 — 대소문자 무시 + trim. rename에선 본인 이름은 허용.
  const isDuplicate = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed || !existingNames) return false;
    const lower = trimmed.toLowerCase();
    if (isRename && lower === initialName.trim().toLowerCase()) return false;
    return existingNames.some(n => n.trim().toLowerCase() === lower);
  }, [name, existingNames, isRename, initialName]);

  const canSubmit = !!name.trim() && !isDuplicate;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(name.trim());
  };

  return (
    <Modal open={open} onClose={onCancel}>
      <Modal.Overlay />
      <Modal.Content style={{ maxWidth: 300 }}>
        <div css={s.body}>
          <div css={s.title}>{isRename ? '어떤 이름으로 바꿀까요?' : '어떤 주제의 그룹을 만들까요?'}</div>
          <input
            ref={inputRef}
            css={s.input(isDuplicate)}
            placeholder="그룹명을 입력하세요"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmit();
              // ESC는 Modal이 처리 (useBackAction)
            }}
            maxLength={20}
          />
          {isDuplicate && (
            <div css={s.errorMsg}>이미 있는 그룹 이름이에요</div>
          )}
          <div css={s.badges}>
            {SUGGESTIONS.map(tag => (
              <button key={tag} type="button" css={s.badge} onClick={() => setName(tag)}>
                {tag}
              </button>
            ))}
          </div>
          <Modal.Actions>
            <Modal.CTA variant="secondary" onClick={onCancel}>취소</Modal.CTA>
            <Modal.CTA onClick={handleSubmit} disabled={!canSubmit}>
              {isRename ? '변경' : '그룹 추가'}
            </Modal.CTA>
          </Modal.Actions>
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
    text-align: center; margin-bottom: ${spacing.xl}px;
  `,
  input: (error: boolean) => css`
    width: 100%;
    padding: ${sp('md', 'xs')} ${spacing.lg}px;
    border: 1px solid ${error ? sem.action.danger : sem.border.default};
    border-radius: ${radius.xl}px;
    background: ${sem.bg.surface}; color: ${sem.text.primary};
    font-size: ${fontSize.lg}px; outline: none; box-sizing: border-box;
    font-family: inherit;
    &::placeholder { color: ${sem.text.tertiary}; }
    &:focus { border-color: ${error ? sem.action.danger : sem.action.primary}; }
  `,
  errorMsg: css`
    margin-top: ${spacing.sm}px;
    font-size: ${fontSize.sm}px;
    color: ${sem.action.danger};
  `,
  badges: css`
    display: flex; flex-wrap: wrap; gap: ${spacing.md}px;
    margin-top: ${spacing.lg}px;
  `,
  badge: css`
    padding: ${spacing.sm}px ${spacing.md + 2}px;
    border: 1px solid ${sem.border.subtle};
    border-radius: ${radius.full}px;
    background: ${sem.bg.elevated};
    color: ${sem.text.secondary};
    font-size: ${fontSize.md}px; font-weight: ${fontWeight.medium};
    font-family: inherit;
    cursor: pointer;
    transition: all ${transition.fast};
    &:hover { background: ${sem.action.primaryTint}; color: ${sem.action.primary}; border-color: ${sem.action.primaryStrong}; }
  `,
};
