/**
 * Design Tokens — 색상 외 모든 디자인 값의 단일 진실 소스(Single Source of Truth)
 * 값을 바꾸면 앱 전체에 반영됨
 */

/** 여백 / 간격 */
export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
} as const;

/** 글자 크기 */
export const fontSize = {
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 15,
  '2xl': 18,
  '3xl': 24,
} as const;

/** 글자 굵기 */
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/** 라운드 */
export const radius = {
  xs: 3,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  '2xl': 12,
  full: 9999,
} as const;

/** 고정 높이 */
export const height = {
  nav: 48,
  row: 48,
  control: 32,
  toggle: 24,
  segSm: 28,
  segMd: 32,
  button: 32,
} as const;

/** 자간 */
export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.3,
  wider: 0.5,
} as const;

/** 트랜지션 */
export const transition = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  smooth: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/** 그림자 */
export const shadow = {
  sm: '0 1px 3px rgba(0,0,0,0.12)',
  md: '0 2px 8px rgba(0,0,0,0.12)',
  lg: '0 4px 20px rgba(0,0,0,0.16)',
  seg: '0 1px 4px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)',
  textSm: '0 1px 2px rgba(0,0,0,0.3)',
  textMd: '0 1px 3px rgba(0,0,0,0.3)',
} as const;

/** spacing 유틸 — 토큰 키를 합산하여 px 문자열 반환 */
type SpaceKey = keyof typeof spacing;
export const sp = (...keys: SpaceKey[]): string =>
  keys.reduce((acc, k) => acc + spacing[k], 0) + 'px';

/** 불투명도 */
export const opacity = {
  hover: 0.9,       // 버튼 hover 살짝 눌림
  muted: 0.7,       // 보조 텍스트, 아이콘
  mutedStrong: 0.85, // 보조 텍스트 강조
  disabled: 0.5,    // 비활성 기본
  disabledWeak: 0.35, // 비활성 약함
  pulse: 0.4,       // 펄스 애니메이션 중간
} as const;

/** z-index 레이어 */
export const zIndex = {
  base: 1,
  dropdown: 100,
  sticky: 200,
  overlay: 500,
  sheet: 550,
  modal: 600,
  toast: 700,
  tooltip: 800,
} as const;

/** 통합 export */
export const tokens = {
  spacing,
  fontSize,
  fontWeight,
  radius,
  height,
  letterSpacing,
  transition,
  shadow,
  opacity,
  zIndex,
} as const;

export type Tokens = typeof tokens;
