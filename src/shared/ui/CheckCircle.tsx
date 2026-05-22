/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiCheck } from 'react-icons/fi';
import { spacing, radius, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  /** 체크 여부 */
  checked: boolean;
  /** 원형 지름 (px) — 기본 16. EditSymbolsSheet, GroupPickerSheet 등 다중 선택 UI에서 표준 사이즈. */
  size?: number;
}

/**
 * CheckCircle — 체크 가능한 원형 인디케이터 공통 컴포넌트.
 *
 * 사용처: EditSymbolsSheet, GroupPickerSheet 같은 다중 선택 행.
 * - 미체크: 투명 배경 + 1px hairline border
 * - 체크: primary 배경 + 흰색 check 아이콘 (strokeWidth 3으로 두껍게)
 *
 * 직접 인터랙티브하지 않음 — 부모 행/버튼이 클릭 이벤트를 처리.
 */
export const CheckCircle = ({ checked, size = spacing.xl }: Props) => (
  <span css={style(checked, size)} aria-hidden="true">
    {checked && <FiCheck size={Math.round(size * 0.75)} strokeWidth={3} />}
  </span>
);

const style = (on: boolean, size: number) => css`
  width: ${size}px; height: ${size}px;
  border-radius: ${radius.full}px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: ${on ? sem.action.primary : 'transparent'};
  color: ${sem.text.inverse};
  border: ${on ? 'none' : `1px solid ${sem.border.default}`};
  transition: background ${transition.fast}, border-color ${transition.fast};
`;
