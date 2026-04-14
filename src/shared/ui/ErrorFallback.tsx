/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiAlertTriangle } from 'react-icons/fi';
import { fontSize, fontWeight, radius, spacing, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const wrapperCss = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${spacing['3xl']}px ${spacing['2xl']}px;
  min-height: 200px;
  text-align: center;
  gap: ${spacing.lg}px;
`;

const iconCss = css`
  color: ${sem.feedback.down};
  font-size: 32px;
  margin-bottom: ${spacing.sm}px;
`;

const titleCss = css`
  font-size: ${fontSize.lg}px;
  font-weight: ${fontWeight.semibold};
  color: ${sem.text.primary};
  margin: 0;
`;

const codeCss = css`
  background: ${sem.bg.elevated};
  border: 1px solid ${sem.border.default};
  border-radius: ${radius.md}px;
  padding: ${spacing.lg}px ${spacing.xl}px;
  font-size: ${fontSize.sm}px;
  color: ${sem.feedback.down};
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
  max-height: 120px;
  overflow: auto;
  margin: 0;
  text-align: left;
`;

const buttonGroupCss = css`
  display: flex;
  gap: ${spacing.md}px;
  margin-top: ${spacing.md}px;
`;

const buttonBaseCss = css`
  padding: ${spacing.md}px ${spacing.xl}px;
  border-radius: ${radius.md}px;
  font-size: ${fontSize.md}px;
  font-weight: ${fontWeight.medium};
  cursor: pointer;
  transition: opacity ${transition.fast};
  border: none;

  &:hover {
    opacity: 0.85;
  }
  &:active {
    opacity: 0.7;
  }
`;

const retryBtnCss = css`
  ${buttonBaseCss}
  background: ${sem.action.primary};
  color: #fff;
`;

const dismissBtnCss = css`
  ${buttonBaseCss}
  background: ${sem.bg.elevated};
  color: ${sem.text.secondary};
  border: 1px solid ${sem.border.default};
`;

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div css={wrapperCss}>
      <FiAlertTriangle css={iconCss} />
      <p css={titleCss}>오류가 발생했습니다</p>
      <pre css={codeCss}>{error.message}</pre>
      <div css={buttonGroupCss}>
        <button css={retryBtnCss} onClick={resetError}>
          다시 시도
        </button>
        <button css={dismissBtnCss} onClick={resetError}>
          무시하고 계속
        </button>
      </div>
    </div>
  );
}
