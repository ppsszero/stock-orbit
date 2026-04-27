// Toss Design System 컬러 기반 테마 + 디자인 토큰
import { tokens } from './tokens';

const lightColors = {
  bg: '#FFFFFF',
  bgSecondary: '#F2F4F6',
  bgTertiary: '#E5E8EB',
  text: '#191F28',
  textSecondary: '#4E5968',
  textTertiary: '#8B95A1',
  textDisabled: '#8B95A130',
  border: '#E5E8EB',
  borderFaint: '#E5E8EB15',
  borderSubtle: '#E5E8EB20',
  borderStrong: '#E5E8EB30',
  borderMuted: '#00000012',
  accent: '#3182F6',
  accentSeg: '#FFFFFF',
  accentSegText: '#191F28',
  up: '#E42939',
  down: '#2272EB',
  flat: '#8B95A1',
  cardBg: '#F7F8FA',
  titleBarBg: '#E5E8EB',
  marqueeBg: '#F2F4F6',
  shadow: '0 2px 8px rgba(0,0,0,0.06)',
  // Action
  danger: '#F04452',
  success: '#00C853',
  warning: '#FF9800',
  // Popover (Toast, Tooltip)
  popoverBg: '#FFFFFF',
  popoverText: '#191F28',
  popoverShadow: '0 2px 12px rgba(0,0,0,0.2)',
  // Tinted (pre-calculated alpha)
  accentTint: '#3182F615',
  accentHover: '#3182F625',
  accentSubtle: '#3182F608',
  accentSelected: '#3182F614',
  accentBorder: '#3182F620',
  accentMedium: '#3182F635',
  accentStrong: '#3182F640',
  dangerTint: '#F0445215',
  dangerBorder: '#F0445220',
  successTint: '#00C85320',
  successHover: '#00C85330',
  // Heatmap — 채도 ramp (L ≈ 43 고정, 채도만 변동)
  // 다크모드의 "투명→불투명" 램프와 동일한 메타포(약함→강함). 흰 텍스트 WCAG AA 유지
  upHeavy: '#DC0000',    // HSL(0, 100%, 43%)
  upStrong: '#CC3939',   // HSL(0, 58%, 51%) — 한 톤 부드럽게
  upMild: '#BC3F3F',     // HSL(0, 50%, 49%)
  upWeak: '#A85959',     // HSL(0, 32%, 50%)
  downHeavy: '#0033E0',  // 순수 파랑
  downStrong: '#1A4FDC', // 또렷한 파랑
  downMild: '#3A60C5',   // 무게 잡힌 파랑
  downWeak: '#5A75B0',   // 차분한 청회색
  // Tile text — 진한 배경이므로 흰색 유지
  tileText: '#FFFFFF',
  tileTextMuted: '#FFFFFFBF',
  tileTextFaint: '#FFFFFF80',
  // Tile text-shadow — 라이트에서는 불필요
  tileShadowSm: 'none',
  tileShadowMd: 'none',
};

const darkColors = {
  bg: '#131417',
  bgSecondary: '#1A1B20',
  bgTertiary: '#25262C',
  text: '#F2F4F6',
  textSecondary: '#B0B8C1',
  textTertiary: '#6B7684',
  textDisabled: '#6B768430',
  border: '#1E1F25',
  borderFaint: '#1E1F2515',
  borderSubtle: '#1E1F2520',
  borderStrong: '#1E1F2530',
  borderMuted: '#FFFFFF12',
  accent: '#4593FC',
  accentSeg: '#2C2D35',
  accentSegText: '#F2F4F6',
  up: '#F04452',
  down: '#3182F6',
  flat: '#6B7684',
  cardBg: '#1A1B20',
  titleBarBg: '#0F1013',
  marqueeBg: '#16171B',
  shadow: '0 2px 8px rgba(0,0,0,0.3)',
  // Action
  danger: '#F04452',
  success: '#00C853',
  warning: '#FF9800',
  // Popover
  popoverBg: '#1E1F25',
  popoverText: '#F2F4F6',
  popoverShadow: '0 4px 24px rgba(0,0,0,0.4)',
  // Tinted
  accentTint: '#4593FC15',
  accentHover: '#4593FC25',
  accentSubtle: '#4593FC08',
  accentSelected: '#4593FC14',
  accentBorder: '#4593FC20',
  accentMedium: '#4593FC35',
  accentStrong: '#4593FC40',
  dangerTint: '#F0445215',
  dangerBorder: '#F0445220',
  successTint: '#00C85320',
  successHover: '#00C85330',
  // Heatmap
  upHeavy: '#F04452D0',
  upStrong: '#F0445290',
  upMild: '#F0445255',
  upWeak: '#F0445230',
  downHeavy: '#3182F6D0',
  downStrong: '#3182F690',
  downMild: '#3182F655',
  downWeak: '#3182F630',
  // Tile text
  tileText: '#FFFFFF',
  tileTextMuted: '#FFFFFFBF',
  tileTextFaint: '#FFFFFF80',
  // Tile text-shadow — 다크 배경에서 가독성 보조
  tileShadowSm: '0 1px 2px rgba(0,0,0,0.3)',
  tileShadowMd: '0 1px 3px rgba(0,0,0,0.3)',
};

export const lightTheme = { ...lightColors, ...tokens };
export const darkTheme = { ...darkColors, ...tokens };

export type Theme = typeof lightTheme;
