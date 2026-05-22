import { css, keyframes } from '@emotion/react';
import { sem } from './semantic';
import { spacing, fontSize, fontWeight, radius, transition } from './tokens';

/**
 * 2단 탭 패턴의 서브탭(pill) 영역 padding — 메인 underline 아래에 위치.
 * RankingSheet, InvestorSheet(market/interest) 등 공유.
 */
export const subTabPadStyle = css`
  padding: 0 ${spacing.xl}px ${spacing.lg}px;
  flex-shrink: 0;
`;

/**
 * 시트 내 리스트 행 — dotted divider + accent hover tint 공통 패턴.
 * MarketSheet, InterestRateView 등 "row 클릭 → 웹뷰" 시트들이 공유.
 * 행 내부 layout(좌측 정보 / 우측 값)은 사용처에서 조립.
 */
export const listRowStyle = css`
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  &:hover { background: ${sem.action.primarySoft}; }
  /* divider는 양옆 여백 두고 inset — 풀폭 hover와 분리 */
  &:not(:last-of-type)::after {
    content: '';
    position: absolute; left: ${spacing.xl}px; right: ${spacing.xl}px; bottom: 0;
    border-bottom: 1px dotted ${sem.border.muted};
  }
`;

/** 가격 갱신 배경 하이라이트 — 트레이딩 터미널 표준 패턴 */
const highlightUp = keyframes`
  0% { background: color-mix(in srgb, ${sem.feedback.up} 25%, transparent); }
  100% { background: transparent; }
`;
const highlightDown = keyframes`
  0% { background: color-mix(in srgb, ${sem.feedback.down} 25%, transparent); }
  100% { background: transparent; }
`;
const highlightFlat = keyframes`
  0% { background: color-mix(in srgb, ${sem.feedback.flat} 20%, transparent); }
  100% { background: transparent; }
`;

/** 가격 갱신 flash 스타일 — usePriceFlash 반환값으로 선택 */
export const priceFlash = {
  up: css`border-radius: 2px; padding: 1px 2px; margin: -1px -2px; animation: ${highlightUp} 0.8s ease-out;`,
  down: css`border-radius: 2px; padding: 1px 2px; margin: -1px -2px; animation: ${highlightDown} 0.8s ease-out;`,
  flat: css`border-radius: 2px; padding: 1px 2px; margin: -1px -2px; animation: ${highlightFlat} 0.8s ease-out;`,
} as const;

/**
 * 시트 푸터/CTA 영역에 들어가는 라운드 버튼 스타일 팩토리.
 * - primary: 액션 색 풀 (이동/확인/완료)
 * - danger: 위험 액션 (삭제) — dangerTint 배경 + danger 글자
 * - neutral: 보조 액션 (닫기/완료) — elevated 배경 + secondary 글자
 *
 * 사용처: EditSymbolsSheet footer, GroupPickerSheet cta, GroupEditSheet doneBtn 등.
 * disabled prop을 가진 buttons 기준.
 */
export type SheetActionVariant = 'primary' | 'danger' | 'neutral';
const ACTION_PALETTE: Record<SheetActionVariant, { bg: string; fg: string; hoverBg?: string }> = {
  primary: { bg: sem.action.primary, fg: sem.text.inverse },
  danger:  { bg: sem.action.dangerTint, fg: sem.action.danger },
  // neutral hover는 filter:brightness 대신 명시적 hoverBg —
  // 라이트모드에서 bg.elevated를 brighten하면 base(white)에 묻혀 버튼이 사라지는 사고 방지.
  neutral: { bg: sem.bg.elevated, fg: sem.text.secondary, hoverBg: sem.action.primarySoft },
};
export const sheetActionBtnStyle = (variant: SheetActionVariant) => {
  const { bg, fg, hoverBg } = ACTION_PALETTE[variant];
  return css`
    flex: 1;
    display: flex; align-items: center; justify-content: center; gap: ${spacing.sm}px;
    padding: ${spacing.lg}px;
    border: none; border-radius: ${radius.lg}px;
    background: ${bg}; color: ${fg};
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold};
    font-family: inherit; cursor: pointer;
    transition: filter ${transition.fast}, background ${transition.fast}, opacity ${transition.fast};
    &:hover:not(:disabled) {
      ${hoverBg ? `background: ${hoverBg};` : 'filter: brightness(1.08);'}
    }
    &:disabled { opacity: 0.4; cursor: default; }
  `;
};

/**
 * 등락 방향별 텍스트 스타일 팩토리.
 * 마퀴/리스트/그리드/랭킹 등 "등락률 텍스트"가 들어가는 자리에 공통 사용.
 * 차이는 fontSize뿐 — 나머지(weight, tabular-nums, 색상)는 동일.
 */
export const makeDirectionalChange = (size: number) => ({
  up: css`font-size: ${size}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.up};`,
  down: css`font-size: ${size}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.down};`,
  flat: css`font-size: ${size}px; font-weight: ${fontWeight.semibold}; font-variant-numeric: tabular-nums; color: ${sem.feedback.flat};`,
}) as Record<'up' | 'down' | 'flat', ReturnType<typeof css>>;
