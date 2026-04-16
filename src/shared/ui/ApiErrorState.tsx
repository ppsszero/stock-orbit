/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiAlertCircle } from 'react-icons/fi';
import { fontSize, fontWeight, radius, spacing, transition, opacity } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface ApiErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const wrapperCss = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${spacing['2xl']}px ${spacing.xl}px;
  gap: ${spacing.md}px;
  text-align: center;
`;

const iconCss = css`
  color: ${sem.feedback.down};
  font-size: 24px;
`;

const messageCss = css`
  font-size: ${fontSize.md}px;
  color: ${sem.text.secondary};
  margin: 0;
`;

const retryBtnCss = css`
  padding: ${spacing.sm}px ${spacing.lg}px;
  border-radius: ${radius.sm}px;
  font-size: ${fontSize.sm}px;
  font-weight: ${fontWeight.medium};
  cursor: pointer;
  transition: opacity ${transition.fast};
  background: ${sem.bg.elevated};
  color: ${sem.text.primary};
  border: 1px solid ${sem.border.default};

  &:hover {
    opacity: ${opacity.mutedStrong};
  }
  &:active {
    opacity: ${opacity.muted};
  }
`;

export function ApiErrorState({ message = '데이터를 불러오지 못했습니다', onRetry }: ApiErrorStateProps) {
  return (
    <div css={wrapperCss}>
      <FiAlertCircle css={iconCss} />
      <p css={messageCss}>{message}</p>
      {onRetry && (
        <button css={retryBtnCss} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}
