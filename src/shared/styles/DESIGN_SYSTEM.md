# Stock Orbit Design System v3 — Enforced

---

## 0. Architecture

```
[L1] Primitive     tokens.ts       spacing.xl = 16
[L2] Color         theme.ts        darkColors.accent = '#4593FC'
[L3] CSS Bridge    vars.ts         v.accent = 'var(--c-accent)'
[L4] Semantic      semantic.ts     sem.action.primary = v.accent
[L5] Component     component.ts    buttonTokens.secondary.hover.bg = sem.bg.elevated
[L6] API           <Button variant="secondary" size="md" />
```

**강제 규칙: L5~L6에서 L4 이하를 직접 참조하면 컴파일 에러.**

---

## 1. Semantic Tokens (완전체)

모든 opacity 조합이 사전 정의됨. 문자열 결합(`+ '15'`) 금지.

### 1-1. theme.ts 확장

```ts
// 기존 darkColors에 추가
const darkColors = {
  // ... 기존 유지

  // Tinted (사전 계산된 alpha)
  accentTint:       '#4593FC15',   // 버튼 tinted bg
  accentHover:      '#4593FC25',   // 버튼 tinted hover bg
  accentSubtle:     '#4593FC08',   // 선택된 row bg
  accentSelected:   '#4593FC14',   // 선택된 탭 bg
  accentBorder:     '#4593FC20',   // 강조 테두리

  dangerTint:       '#F0445215',   // danger hover bg
  dangerBorder:     '#F0445220',   // danger hover 테두리

  successTint:      '#00C85320',   // 추가 완료 bg
  successHover:     '#00C85330',   // 추가 완료 hover bg
};
```

### 1-2. vars.ts 확장

```ts
export const v = {
  // ... 기존 유지

  accentTint:       'var(--c-accent-tint)',
  accentHover:      'var(--c-accent-hover)',
  accentSubtle:     'var(--c-accent-subtle)',
  accentSelected:   'var(--c-accent-selected)',
  accentBorder:     'var(--c-accent-border)',

  dangerTint:       'var(--c-danger-tint)',
  dangerBorder:     'var(--c-danger-border)',

  successTint:      'var(--c-success-tint)',
  successHover:     'var(--c-success-hover)',
} as const;
```

### 1-3. semantic.ts (신규)

```ts
import { v } from './vars';

export const sem = {
  text: {
    primary:    v.text,
    secondary:  v.textSecondary,
    tertiary:   v.textTertiary,
    inverse:    '#FFFFFF',
  },
  bg: {
    base:       v.bg,
    surface:    v.bgSecondary,
    elevated:   v.bgTertiary,
  },
  border: {
    default:    v.border,
    focus:      v.accent,
    subtle:     v.accentBorder,
  },
  action: {
    primary:       v.accent,
    primaryTint:   v.accentTint,
    primaryHover:  v.accentHover,
    primarySubtle: v.accentSubtle,

    danger:        '#F04452',
    dangerTint:    v.dangerTint,
    dangerBorder:  v.dangerBorder,

    success:       '#00C853',
    successTint:   v.successTint,
    successHover:  v.successHover,
  },
  feedback: {
    up:   v.up,
    down: v.down,
    flat: v.flat,
  },
  surface: {
    card:     v.cardBg,
    titleBar: v.titleBarBg,
    marquee:  v.marqueeBg,
  },
} as const;
```

**사용 전:**
```ts
// 금지 — 문자열 결합
background: ${t.accent + '15'};
```

**사용 후:**
```ts
// 강제 — 사전 정의 토큰
background: ${sem.action.primaryTint};
```

---

## 2. Component State Tokens (모든 값 확정)

모든 인터랙티브 컴포넌트의 상태를 명시적 토큰으로 정의.
`darken`, `lighten`, "한 단계 진하게" 금지.

### 2-1. Button

```ts
export const buttonTokens = {
  primary: {
    default:  { bg: sem.action.primary,     border: 'none',                          color: sem.text.inverse },
    hover:    { bg: sem.action.primaryHover, border: 'none',                          color: sem.text.inverse },
    disabled: { bg: sem.action.primary,      border: 'none',                          color: sem.text.inverse, opacity: 0.5 },
  },
  secondary: {
    default:  { bg: sem.bg.surface,   border: `1px solid ${sem.border.default}`, color: sem.text.secondary },
    hover:    { bg: sem.bg.elevated,  border: `1px solid ${sem.border.default}`, color: sem.text.secondary },
    disabled: { bg: sem.bg.surface,   border: `1px solid ${sem.border.default}`, color: sem.text.tertiary, opacity: 0.5 },
  },
  ghost: {
    default:  { bg: 'transparent',    border: 'none',                            color: sem.text.secondary },
    hover:    { bg: sem.bg.surface,   border: 'none',                            color: sem.text.primary },
    disabled: { bg: 'transparent',    border: 'none',                            color: sem.text.tertiary, opacity: 0.5 },
  },
  danger: {
    default:  { bg: 'transparent',         border: `1px solid ${sem.action.danger}`, color: sem.action.danger },
    hover:    { bg: sem.action.dangerTint,  border: `1px solid ${sem.action.danger}`, color: sem.action.danger },
    disabled: { bg: 'transparent',         border: `1px solid ${sem.action.danger}`, color: sem.action.danger, opacity: 0.5 },
  },
} as const;
```

```ts
export const buttonSizes = {
  sm: { height: 28,              padding: `0 ${spacing.md}px`, fontSize: fontSize.sm },
  md: { height: height.control,  padding: `0 ${spacing.lg}px`, fontSize: fontSize.md },
  lg: { height: height.row,      padding: `0 ${spacing.xl}px`, fontSize: fontSize.base },
} as const;
```

### 2-2. Card

```ts
export const cardTokens = {
  default: {
    default: { bg: sem.surface.card,          border: `1px solid ${sem.border.default}` },
    hover:   { bg: sem.bg.surface,            border: `1px solid ${sem.border.default}` },
  },
  highlighted: {
    default: { bg: sem.action.primarySubtle,  border: `1px solid ${sem.border.subtle}` },
    hover:   { bg: sem.action.primaryTint,    border: `1px solid ${sem.action.primaryHover}` },
  },
} as const;
```

### 2-3. Input

```ts
export const inputTokens = {
  default:   { bg: sem.bg.surface, border: `1px solid ${sem.border.default}`, color: sem.text.primary },
  focus:     { bg: sem.bg.surface, border: `1px solid ${sem.border.focus}`,   color: sem.text.primary },
  capturing: { bg: sem.bg.surface, border: `1px solid ${sem.border.focus}`,   color: sem.action.primary },
  disabled:  { bg: sem.bg.surface, border: `1px solid ${sem.border.default}`, color: sem.text.primary, opacity: 0.5 },
} as const;
```

### 2-4. IconButton

```ts
export const iconButtonTokens = {
  default: {
    default: { bg: sem.bg.elevated,          color: sem.text.secondary },
    hover:   { bg: sem.bg.elevated,          color: sem.text.primary },
  },
  ghost: {
    default: { bg: 'transparent',            color: sem.text.secondary },
    hover:   { bg: sem.bg.surface,           color: sem.text.primary },
  },
  accent: {
    default: { bg: sem.action.primaryTint,   color: sem.action.primary },
    hover:   { bg: sem.action.primaryHover,  color: sem.action.primary },
    active:  { bg: sem.bg.elevated,          color: sem.text.tertiary },
  },
  danger: {
    default: { bg: sem.bg.elevated,          color: sem.text.tertiary },
    hover:   { bg: sem.action.dangerTint,    color: sem.action.danger },
  },
} as const;
```

### 2-5. Toggle

```ts
export const toggleTokens = {
  off:      { track: sem.bg.elevated,     knob: '#FFFFFF' },
  on:       { track: sem.action.primary,  knob: '#FFFFFF' },
  disabled: { opacity: 0.5 },
} as const;
```

### 2-6. AddButton

```ts
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
```

---

## 3. Typography

| Token | px | Role |
|-------|----|------|
| `xs` | 10 | 뱃지, 레이블 |
| `sm` | 11 | 섹션 타이틀, 타임스탬프 |
| `md` | 12 | 버튼, 보조 정보 |
| `base` | **13** | **기본 본문** |
| `lg` | 14 | row 라벨, 종목명 |
| `xl` | 15 | 시트 타이틀, 뉴스 제목 |
| `2xl` | 18 | 히어로 숫자 |

| Weight | Value | Role |
|--------|-------|------|
| `normal` | 400 | 긴 본문 |
| `medium` | 500 | 라이트 모드 기본 |
| `semibold` | 600 | 버튼, 보조 강조 |
| `bold` | 700 | 섹션 타이틀, 라벨 |
| `extrabold` | 800 | 숫자 강조 |

**강제:**
- 숫자 → `font-variant-numeric: tabular-nums`
- button, input, select → `font-family: inherit`
- 섹션 타이틀 → `text-transform: uppercase` + `letterSpacing.wider`

---

## 4. Spacing & Layout

| Token | px | Role |
|-------|----|------|
| `xs` | 2 | 미세 보정 |
| `sm` | 4 | gap |
| `md` | 8 | 기본 gap |
| `lg` | 12 | 버튼 패딩 |
| `xl` | **16** | **표준 좌우 패딩** |
| `2xl` | 20 | 내부 패딩 |
| `3xl` | 24 | 타임라인 하단 |

**시트 레이아웃:**
```
SheetLayout
├── nav          h:48  px:12
├── segmented    px:16  py:8
└── body         flex:1  overflow-y:auto
    ├── sectionTitle   px:16
    ├── row            h:48  px:16
    └── ...
```

| Rule | Value |
|------|-------|
| 시트 좌우 패딩 | `spacing.xl` (16) |
| row 높이 | `height.row` (48) |
| 컨트롤 높이 | `height.control` (32) |

---

## 5. Composition Rules

### 5-1. 강조(Primary) 제한

| Rule | Detail |
|------|--------|
| **한 화면에 primary 버튼은 최대 1개** | 여러 액션 중 가장 중요한 1개만. 나머지는 secondary 또는 ghost |
| **Card 내부에 primary 버튼 금지** | Card는 정보 표시 단위. 내부 액션은 ghost 또는 IconButton |
| **primary + danger 동시 노출 금지** | 같은 섹션에 "실행"과 "삭제"가 나란히 있으면 혼란 |

### 5-2. Button vs IconButton 역할 구분

| Component | When |
|-----------|------|
| `Button` | 텍스트 라벨이 필요한 액션 (더보기, 초기화, 저장) |
| `IconButton` | 아이콘만으로 의미가 명확한 액션 (닫기, 새로고침, 삭제, 접기) |

**금지:** 텍스트 + 아이콘이 함께 필요한 곳에 IconButton 사용 → Button으로.

### 5-3. Sheet 내부 액션 규칙

| Position | Allowed | Forbidden |
|----------|---------|-----------|
| nav 영역 | `IconButton(ghost)`, 텍스트 버튼 | primary 버튼, danger 버튼 |
| row 내부 | `Button(secondary)`, `Toggle`, `SegmentedControl`, `Input` | primary 버튼 |
| 하단 독립 영역 | `Button(danger, lg)` | ghost 단독 사용 |

### 5-4. Card 내부 규칙

| Allowed | Forbidden |
|---------|-----------|
| 텍스트 (label + value) | Button(primary) |
| StatusDot, Badge | SegmentedControl |
| IconButton(ghost) — 보조 액션 | Toggle |

### 5-5. 텍스트 우선순위

한 row에서 정보 충돌 시:

```
1. label (flex:1, 말줄임 허용)
2. value / control (flex-shrink:0, 절대 줄지 않음)
```

**금지:** control 영역에 긴 텍스트. 잘리거나 줄바꿈되면 안 됨.

### 5-6. SegmentedControl 일관성

| Rule | Detail |
|------|--------|
| 같은 시트 내 size 통일 | 설정 시트 = 모두 `md` |
| 탭 라벨 글자 수 | 최대 6자 (한글 기준). 초과 시 약어 사용 |
| 시트 당 SegmentedControl 최대 1개 | nav 아래 위치 고정 |

---

## 6. TypeScript 강제 구조

### 6-1. Variant × Size 타입 제한

```ts
// types/design.ts

export const BUTTON_VARIANTS = {
  primary:   'primary',
  secondary: 'secondary',
  ghost:     'ghost',
  danger:    'danger',
} as const;

export const BUTTON_SIZES = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

// Forbidden 조합을 타입으로 막기
type ForbiddenButtonCombo =
  | { variant: 'primary'; size: 'sm' }
  | { variant: 'danger';  size: 'sm' };

type AllButtonCombo = { variant: ButtonVariant; size: ButtonSize };

// Forbidden을 제외한 허용 조합만 추출
type AllowedButtonCombo = Exclude<AllButtonCombo, ForbiddenButtonCombo>;

// Props에 적용
type ButtonBaseProps = {
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
};

export type ButtonProps = AllowedButtonCombo & ButtonBaseProps;
```

**사용:**
```tsx
// 컴파일 성공
<Button variant="secondary" size="md" />
<Button variant="danger" size="lg" />

// 컴파일 에러 — ForbiddenButtonCombo
<Button variant="primary" size="sm" />   // TS Error
<Button variant="danger" size="sm" />    // TS Error
```

### 6-2. IconButton Variant 타입

```ts
export const ICON_BUTTON_VARIANTS = {
  default: 'default',
  ghost:   'ghost',
  accent:  'accent',
  danger:  'danger',
} as const;

export type IconButtonVariant = keyof typeof ICON_BUTTON_VARIANTS;

export interface IconButtonProps {
  variant?: IconButtonVariant;
  size?: number;
  active?: boolean;
  icon: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}
```

### 6-3. Card Variant 타입

```ts
export const CARD_VARIANTS = {
  default:     'default',
  highlighted: 'highlighted',
} as const;

export type CardVariant = keyof typeof CARD_VARIANTS;

export interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  onClick?: () => void;
}
```

### 6-4. Toast Type 타입

```ts
export const TOAST_TYPES = {
  success: 'success',
  error:   'error',
  info:    'info',
  delete:  'delete',
  copy:    'copy',
} as const;

export type ToastType = keyof typeof TOAST_TYPES;
```

### 6-5. SegmentedControl Size 제한

```ts
export const SEG_SIZES = {
  sm: 'sm',
  md: 'md',
} as const;

export type SegSize = keyof typeof SEG_SIZES;
```

---

## 7. Runtime Guards

타입으로 막을 수 없는 composition 규칙을 개발 환경에서 경고.

### 7-1. guard 함수

```ts
// utils/designGuard.ts

const isDev = process.env.NODE_ENV === 'development';

export const designGuard = {
  /** primary 버튼이 Card 내부에서 사용됐을 때 */
  noPrimaryInCard: (variant: string, context: string) => {
    if (isDev && variant === 'primary' && context === 'card') {
      console.warn(
        `[DesignSystem] Button variant="primary" is forbidden inside Card.\n` +
        `Use variant="ghost" or IconButton instead.`
      );
    }
  },

  /** 같은 시트 내 SegmentedControl size 불일치 */
  segSizeConsistency: (sizes: string[]) => {
    if (isDev && new Set(sizes).size > 1) {
      console.warn(
        `[DesignSystem] SegmentedControl sizes must be consistent within a sheet.\n` +
        `Found: ${sizes.join(', ')}`
      );
    }
  },

  /** font-family: inherit 누락 검출 */
  fontFamilyInherit: (element: string, hasInherit: boolean) => {
    if (isDev && !hasInherit && ['button', 'input', 'select'].includes(element)) {
      console.warn(
        `[DesignSystem] <${element}> must have font-family: inherit.\n` +
        `Without it, system font will be used instead of Pretendard.`
      );
    }
  },

  /** forbidden variant+size 조합 (타입 우회 방지) */
  buttonCombo: (variant: string, size: string) => {
    const forbidden = [
      { variant: 'primary', size: 'sm' },
      { variant: 'danger',  size: 'sm' },
    ];
    if (isDev && forbidden.some(f => f.variant === variant && f.size === size)) {
      console.warn(
        `[DesignSystem] Button variant="${variant}" size="${size}" is a forbidden combination.`
      );
    }
  },

  /** 문자열 alpha 결합 감지 */
  noAlphaConcat: (value: string) => {
    if (isDev && /var\(--[^)]+\)[0-9a-fA-F]{2}$/.test(value)) {
      console.warn(
        `[DesignSystem] String alpha concatenation detected: "${value}".\n` +
        `Use pre-defined semantic tokens instead (e.g., sem.action.primaryTint).`
      );
    }
  },
} as const;
```

### 7-2. 컴포넌트 내 적용 예시

```tsx
// Button.tsx
export const Button = ({ variant, size = 'md', ...props }: ButtonProps) => {
  designGuard.buttonCombo(variant, size);

  const tokens = buttonTokens[variant];
  const sizeTokens = buttonSizes[size];
  // ...
};
```

```tsx
// Card.tsx — children 내부에서 Button 사용 시
export const Card = ({ variant = 'default', children }: CardProps) => {
  // Card 컨텍스트를 Context API로 전달하여 내부 Button에서 검사
  return (
    <CardContext.Provider value="card">
      <div css={...}>{children}</div>
    </CardContext.Provider>
  );
};
```

---

## 8. Component API Reference

### Button

```ts
type ButtonProps = AllowedButtonCombo & {
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
};

// defaults: size = 'md'
```

### Card

```ts
interface CardProps {
  variant?: 'default' | 'highlighted';  // default: 'default'
  children: ReactNode;
  onClick?: () => void;
}
```

### Input

```ts
interface InputProps {
  type: 'text' | 'number' | 'select' | 'shortcut';
  disabled?: boolean;
}

// Fixed: height.control, radius.lg, fontSize.base
// State: default → focus (border.focus) → capturing (action.primary)
```

### IconButton

```ts
interface IconButtonProps {
  variant?: 'default' | 'ghost' | 'accent' | 'danger';  // default: 'default'
  size?: number;                                          // default: 32
  active?: boolean;
  icon: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}
```

### Toggle

```ts
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

// Fixed: 44×24, knob 20×20, radius.2xl
```

### SegmentedControl

```ts
interface SegmentedControlProps<T extends string> {
  items: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';                   // default: 'sm'
}

// Rule: 같은 시트 내 size 통일
```

### Toast

```ts
type ToastType = 'success' | 'error' | 'info' | 'delete' | 'copy';

interface ToastAPI {
  show: (message: string, type?: ToastType) => void;
}

// Fixed: radius.2xl, fontSize.base, auto-dismiss 2400ms
```

### TimelineRow

```ts
interface TimelineRowProps {
  dotStyle?: SerializedStyles;
  isLast: boolean;
  children: ReactNode;
}

// Fixed: track 14px, dot 10×10, line 1px, body pb: spacing.3xl
```

---

## 9. Shared Assets

### Styles (sharedStyles.ts)

| Name | Used By |
|------|---------|
| `sectionTitleStyle` | SettingsSheet, MarqueeSheet, InvestorView |
| `groupHeaderStyle` | StockList, StockGrid, StockTile |

### Components (shared/ui/)

| Component | Variants |
|-----------|----------|
| `SheetLayout` | - |
| `SegmentedControl` | sm / md |
| `Toggle` | - |
| `IconButton` | default / ghost / accent / danger |
| `AddButton` | idle / added |
| `Badge` / `StatusDot` | dynamic color |
| `Toast` | success / error / info / delete / copy |
| `TimelineRow` | dot customizable |
| `LoadingCenter` | - |
| `WebViewPanel` | - |
| `ConfirmDialog` | danger / normal |

### Extraction Rule

| Condition | Action |
|-----------|--------|
| CSS 2곳+ 반복 | `sharedStyles.ts` |
| JSX+로직 반복 | `shared/ui/` 컴포넌트 |
| 1곳만 | 로컬 유지 |

---

## 10. Checklist

| # | Check | Enforcement |
|---|-------|-------------|
| 1 | `sem.*` 토큰만 사용 | code review |
| 2 | 삽입 지점 패턴 일치 | code review |
| 3 | 동일 컴포넌트 중복 확인 | code review |
| 4 | 모든 상태 정의됨 | `buttonTokens` 등 참조 |
| 5 | `font-family: inherit` | `designGuard.fontFamilyInherit` |
| 6 | 2곳+ 중복 → shared | code review |
| 7 | Forbidden combo 아님 | TypeScript compile + `designGuard.buttonCombo` |
| 8 | Composition rule 준수 | `designGuard.noPrimaryInCard` 등 |
| 9 | 문자열 alpha 결합 없음 | `designGuard.noAlphaConcat` |
