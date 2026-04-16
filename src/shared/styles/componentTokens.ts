import { sem } from './semantic';
import { spacing, fontSize, fontWeight, radius, height, transition, opacity } from './tokens';

// ── Button ──

export const buttonTokens = {
  primary: {
    default:  { bg: sem.action.primary,     border: 'none',                               color: sem.text.inverse },
    hover:    { bg: sem.action.primaryHover, border: 'none',                               color: sem.text.inverse },
    disabled: { bg: sem.action.primary,      border: 'none',                               color: sem.text.inverse, opacity: opacity.disabled },
  },
  secondary: {
    default:  { bg: sem.bg.surface,          border: `1px solid ${sem.border.default}`,    color: sem.text.secondary },
    hover:    { bg: sem.bg.elevated,         border: `1px solid ${sem.border.default}`,    color: sem.text.secondary },
    disabled: { bg: sem.bg.surface,          border: `1px solid ${sem.border.default}`,    color: sem.text.tertiary, opacity: opacity.disabled },
  },
  ghost: {
    default:  { bg: 'transparent',           border: 'none',                               color: sem.text.secondary },
    hover:    { bg: sem.bg.surface,          border: 'none',                               color: sem.text.primary },
    disabled: { bg: 'transparent',           border: 'none',                               color: sem.text.tertiary, opacity: opacity.disabled },
  },
  danger: {
    default:  { bg: 'transparent',           border: `1px solid ${sem.action.danger}`,     color: sem.action.danger },
    hover:    { bg: sem.action.dangerTint,   border: `1px solid ${sem.action.danger}`,     color: sem.action.danger },
    disabled: { bg: 'transparent',           border: `1px solid ${sem.action.danger}`,     color: sem.action.danger, opacity: opacity.disabled },
  },
} as const;

export const buttonSizes = {
  sm: { height: 28,             padding: `0 ${spacing.md}px`, fontSize: fontSize.sm },
  md: { height: height.control, padding: `0 ${spacing.lg}px`, fontSize: fontSize.md },
  lg: { height: height.row,     padding: `0 ${spacing.xl}px`, fontSize: fontSize.base },
} as const;

export const buttonCommon = {
  borderRadius: radius.lg,
  fontWeight: fontWeight.semibold,
  transition: transition.fast,
  gap: spacing.sm,
} as const;

// ── Card ──

export const cardTokens = {
  default: {
    default: { bg: sem.surface.card,         border: `1px solid ${sem.border.default}` },
    hover:   { bg: sem.bg.surface,           border: `1px solid ${sem.border.default}` },
  },
  highlighted: {
    default: { bg: sem.action.primarySubtle, border: `1px solid ${sem.border.subtle}` },
    hover:   { bg: sem.action.primaryTint,   border: `1px solid ${sem.action.primaryHover}` },
  },
} as const;

export const cardCommon = {
  borderRadius: radius.xl,
  padding: spacing['2xl'] - 6,
  gap: spacing.sm,
} as const;

// ── Input ──

export const inputTokens = {
  default:   { bg: sem.bg.surface, border: `1px solid ${sem.border.default}`, color: sem.text.primary },
  focus:     { bg: sem.bg.surface, border: `1px solid ${sem.border.focus}`,   color: sem.text.primary },
  capturing: { bg: sem.bg.surface, border: `1px solid ${sem.border.focus}`,   color: sem.action.primary },
  disabled:  { bg: sem.bg.surface, border: `1px solid ${sem.border.default}`, color: sem.text.primary, opacity: opacity.disabled },
} as const;

export const inputCommon = {
  height: height.control,
  borderRadius: radius.lg,
  fontSize: fontSize.base,
  transition: transition.fast,
} as const;

// ── IconButton ──

export const iconButtonTokens = {
  default: {
    default: { bg: sem.bg.elevated,        color: sem.text.secondary },
    hover:   { bg: sem.bg.elevated,        color: sem.action.primary },
  },
  ghost: {
    default: { bg: 'transparent',          color: sem.text.secondary },
    hover:   { bg: sem.bg.surface,         color: sem.text.primary },
  },
  accent: {
    default: { bg: sem.action.primaryTint, color: sem.action.primary },
    hover:   { bg: sem.action.primaryHover, color: sem.action.primary },
    active:  { bg: sem.bg.elevated,        color: sem.text.tertiary },
  },
  danger: {
    default: { bg: sem.bg.elevated,        color: sem.text.secondary },
    hover:   { bg: sem.bg.elevated,        color: sem.action.danger },
  },
} as const;

// ── Toggle ──

export const toggleTokens = {
  off:      { track: sem.bg.elevated,    knob: sem.text.inverse },
  on:       { track: sem.action.primary, knob: sem.text.inverse },
  disabled: { opacity: opacity.disabled },
} as const;

// ── AddButton ──

export const addButtonTokens = {
  idle: {
    default: { bg: sem.action.primaryTint,  color: sem.action.primary },
    hover:   { bg: sem.action.primaryHover, color: sem.action.primary },
  },
  added: {
    default: { bg: sem.action.successTint,  color: sem.action.success },
    hover:   { bg: sem.action.successHover, color: sem.action.success },
  },
} as const;
