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
  // Heatmap — 라이트는 명도/채도를 직접 조절하여 단계 폭 확보
  // Heatmap — WCAG AA (vs #FFFFFF), Weak도 5.5:1 이상 확보
  upHeavy: '#7F1D1D',    // 13.6:1
  upStrong: '#991B1B',   // 10.2:1
  upMild: '#B91C1C',     //  7.1:1
  upWeak: '#C62828',     //  5.6:1
  downHeavy: '#1E3A8A',  // 12.8:1
  downStrong: '#1E40AF', //  9.5:1
  downMild: '#1D4ED8',   //  6.4:1
  downWeak: '#2D63D5',   //  5.5:1
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
