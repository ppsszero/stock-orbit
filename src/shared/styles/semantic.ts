import { v } from './vars';

export const sem = {
  text: {
    primary:   v.text,
    secondary: v.textSecondary,
    tertiary:  v.textTertiary,
    disabled:  v.textDisabled,
    inverse:   v.inverse,
  },
  bg: {
    base:     v.bg,
    surface:  v.bgSecondary,
    elevated: v.bgTertiary,
  },
  border: {
    default: v.border,          // 일반 테두리 (input, card, 구분선)
    faint:   v.borderFaint,     // 15% — 가장 얇은 구분선 (StockRow)
    subtle:  v.borderSubtle,    // 20% — 일반 리스트 구분선
    strong:  v.borderStrong,    // 30% — 강한 구분선 (GridCard border, divider)
    focus:   v.accent,          // 포커스 링
    accent:  v.accentBorder,    // accent 20% — 강조 카드 테두리
  },
  action: {
    primary:         v.accent,
    primaryTint:     v.accentTint,      // 15% bg
    primaryHover:    v.accentHover,     // 25% bg
    primarySubtle:   v.accentSubtle,    // 08% bg
    primarySelected: v.accentSelected,  // 14% bg
    primaryMedium:   v.accentMedium,    // 35% bg (badge hover)
    primaryStrong:   v.accentStrong,    // 40% (outline, border hover)

    danger:       v.danger,
    dangerTint:   v.dangerTint,
    dangerBorder: v.dangerBorder,

    success:      v.success,
    successTint:  v.successTint,
    successHover: v.successHover,

    warning:      v.warning,
  },
  feedback: {
    up:   v.up,
    down: v.down,
    flat: v.flat,
  },
  heatmap: {
    upHeavy:    v.upHeavy,
    upStrong:   v.upStrong,
    upMild:     v.upMild,
    upWeak:     v.upWeak,
    downHeavy:  v.downHeavy,
    downStrong: v.downStrong,
    downMild:   v.downMild,
    downWeak:   v.downWeak,
    text:       v.tileText,
    textMuted:  v.tileTextMuted,
    textFaint:  v.tileTextFaint,
  },
  overlay: {
    dim:    'rgba(0,0,0,0.5)',   // 모달 배경
    medium: 'rgba(0,0,0,0.3)',   // box-shadow 내부
    light:  'rgba(0,0,0,0.2)',   // 가벼운 딤
    subtle: 'rgba(0,0,0,0.1)',   // 매우 가벼운 배경
  },
  surface: {
    card:        v.cardBg,
    titleBar:    v.titleBarBg,
    marquee:     v.marqueeBg,
    seg:         v.accentSeg,
    segText:     v.accentSegText,
    popover:     v.popoverBg,
    popoverText: v.popoverText,
  },
  shadow: {
    default: v.shadow,
    popover: v.popoverShadow,
  },
} as const;
