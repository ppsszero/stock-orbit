/**
 * CSS Custom Properties 기반 테마 시스템.
 *
 * 왜 이렇게 바꾸는가:
 * - 기존: (t: Theme) => css`color: ${t.text}` → 매 렌더마다 새 CSS 생성 (런타임 비용)
 * - 이후: css`color: var(--c-text)` → 한 번 생성, 재사용 (제로 런타임)
 * - 테마 전환 시 :root CSS 변수만 교체 → 전체 DOM 자동 반영
 * - 컴포넌트가 theme prop/useTheme()을 호출할 필요 없음
 */

/** CSS 변수 이름 상수 — 오타 방지 + 자동완성 */
export const v = {
  // Background
  bg: 'var(--c-bg)',
  bgSecondary: 'var(--c-bg-secondary)',
  bgTertiary: 'var(--c-bg-tertiary)',
  // Text
  text: 'var(--c-text)',
  textSecondary: 'var(--c-text-secondary)',
  textTertiary: 'var(--c-text-tertiary)',
  // Border & Accent
  border: 'var(--c-border)',
  borderFaint: 'var(--c-border-faint)',
  borderSubtle: 'var(--c-border-subtle)',
  borderStrong: 'var(--c-border-strong)',
  accent: 'var(--c-accent)',
  accentSeg: 'var(--c-accent-seg)',
  accentSegText: 'var(--c-accent-seg-text)',
  // Stock colors
  up: 'var(--c-up)',
  down: 'var(--c-down)',
  flat: 'var(--c-flat)',
  // Surfaces
  cardBg: 'var(--c-card-bg)',
  titleBarBg: 'var(--c-titlebar-bg)',
  marqueeBg: 'var(--c-marquee-bg)',
  shadow: 'var(--c-shadow)',
  // Action
  danger: 'var(--c-danger)',
  success: 'var(--c-success)',
  warning: 'var(--c-warning)',
  // Tinted
  accentTint: 'var(--c-accent-tint)',
  accentHover: 'var(--c-accent-hover)',
  accentSubtle: 'var(--c-accent-subtle)',
  accentSelected: 'var(--c-accent-selected)',
  accentBorder: 'var(--c-accent-border)',
  accentMedium: 'var(--c-accent-medium)',
  accentStrong: 'var(--c-accent-strong)',
  dangerTint: 'var(--c-danger-tint)',
  dangerBorder: 'var(--c-danger-border)',
  successTint: 'var(--c-success-tint)',
  successHover: 'var(--c-success-hover)',
  // Popover
  popoverBg: 'var(--c-popover-bg)',
  popoverText: 'var(--c-popover-text)',
  popoverShadow: 'var(--c-popover-shadow)',
  // Text state
  textDisabled: 'var(--c-text-disabled)',
  // Heatmap
  upHeavy: 'var(--c-up-heavy)',
  upStrong: 'var(--c-up-strong)',
  upMild: 'var(--c-up-mild)',
  upWeak: 'var(--c-up-weak)',
  downHeavy: 'var(--c-down-heavy)',
  downStrong: 'var(--c-down-strong)',
  downMild: 'var(--c-down-mild)',
  downWeak: 'var(--c-down-weak)',
  tileText: 'var(--c-tile-text)',
  tileTextMuted: 'var(--c-tile-text-muted)',
  tileTextFaint: 'var(--c-tile-text-faint)',
  tileShadowSm: 'var(--c-tile-shadow-sm)',
  tileShadowMd: 'var(--c-tile-shadow-md)',
  // Inverse (theme-independent)
  inverse: 'var(--c-inverse)',
} as const;

/** 테마 객체 → CSS 변수 문자열로 변환 */
export const themeToVars = (colors: Record<string, string>): string => `
  --c-bg: ${colors.bg};
  --c-bg-secondary: ${colors.bgSecondary};
  --c-bg-tertiary: ${colors.bgTertiary};
  --c-text: ${colors.text};
  --c-text-secondary: ${colors.textSecondary};
  --c-text-tertiary: ${colors.textTertiary};
  --c-border: ${colors.border};
  --c-border-faint: ${colors.borderFaint};
  --c-border-subtle: ${colors.borderSubtle};
  --c-border-strong: ${colors.borderStrong};
  --c-accent: ${colors.accent};
  --c-accent-seg: ${colors.accentSeg};
  --c-accent-seg-text: ${colors.accentSegText};
  --c-up: ${colors.up};
  --c-down: ${colors.down};
  --c-flat: ${colors.flat};
  --c-card-bg: ${colors.cardBg};
  --c-titlebar-bg: ${colors.titleBarBg};
  --c-marquee-bg: ${colors.marqueeBg};
  --c-shadow: ${colors.shadow};
  --c-danger: ${colors.danger};
  --c-success: ${colors.success};
  --c-warning: ${colors.warning};
  --c-accent-tint: ${colors.accentTint};
  --c-accent-hover: ${colors.accentHover};
  --c-accent-subtle: ${colors.accentSubtle};
  --c-accent-selected: ${colors.accentSelected};
  --c-accent-border: ${colors.accentBorder};
  --c-accent-medium: ${colors.accentMedium};
  --c-accent-strong: ${colors.accentStrong};
  --c-danger-tint: ${colors.dangerTint};
  --c-danger-border: ${colors.dangerBorder};
  --c-success-tint: ${colors.successTint};
  --c-success-hover: ${colors.successHover};
  --c-popover-bg: ${colors.popoverBg};
  --c-popover-text: ${colors.popoverText};
  --c-popover-shadow: ${colors.popoverShadow};
  --c-text-disabled: ${colors.textDisabled};
  --c-up-heavy: ${colors.upHeavy};
  --c-up-strong: ${colors.upStrong};
  --c-up-mild: ${colors.upMild};
  --c-up-weak: ${colors.upWeak};
  --c-down-heavy: ${colors.downHeavy};
  --c-down-strong: ${colors.downStrong};
  --c-down-mild: ${colors.downMild};
  --c-down-weak: ${colors.downWeak};
  --c-tile-text: ${colors.tileText};
  --c-tile-text-muted: ${colors.tileTextMuted};
  --c-tile-text-faint: ${colors.tileTextFaint};
  --c-tile-shadow-sm: ${colors.tileShadowSm};
  --c-tile-shadow-md: ${colors.tileShadowMd};
  --c-inverse: #FFFFFF;
`;
