# Vanilla Extract 기반 디자인 시스템 설계 기준서

> **이 문서는 다음 프로젝트에서 Vanilla Extract를 처음부터 사용할 때 참고하는 설계 기준서다.**
> **현재 Stock Orbit 프로젝트와는 무관하며, 마이그레이션 계획이 아니다.**

---

## 0. 이 문서의 배경과 용도

**Stock Orbit 프로젝트는 Emotion 기반으로 완성됐다.** Emotion의 런타임 비용을 회피하기 위해 CSS 변수 체계, 사전 계산 스타일 맵, ESLint 커스텀 규칙 등 별도 인프라를 구축했고, 이는 프로덕션 수준에서 안정적으로 동작한다.

그 과정에서 "이런 우회 설계를 처음부터 하지 않으려면 어떤 도구와 설계 원칙이 필요한가?"에 대한 답을 고민했고, 그 결과가 이 문서다.

### 이 문서의 용도

| 분류 | 내용 |
|---|---|
| **독자** | 다음 프로젝트에서 처음부터 Vanilla Extract를 쓰려는 개발자 |
| **목적** | 구조 붕괴 없이 지속 가능한 디자인 시스템을 설계하는 기준 제공 |
| **범위** | 레이어 구조, 도구 선택, 금지 규칙, 리뷰 기준, 거버넌스 |
| **성격** | 강제 규칙이 아닌 **설계 참조서**. 실전 프로젝트에서 각자 조정 |

### 왜 Vanilla Extract인가

Vanilla Extract는 빌드 타임에 CSS를 추출하는 **zero-runtime CSS-in-JS** 솔루션이다.

| 항목 | 일반 runtime CSS-in-JS (Emotion 등) | Vanilla Extract |
|---|---|---|
| 런타임 CSS 생성 | 있음 (JS에서 주입) | **0** (빌드 타임 추출) |
| 테마 시스템 | 수동 구축 필요 | `createTheme` 공식 지원 |
| 타입 안전성 | 템플릿 리터럴 (느슨) | 객체 기반 (강함) |
| variant 패턴 | 수동 구현 | `recipe` 공식 지원 |
| 번들 사이즈 | 런타임 라이브러리 포함 | **CSS만 남음** |
| 하드코딩 방어 | ESLint 커스텀 규칙 필요 | 구조 자체가 강제 |

### Stock Orbit에 적용하지 않은 이유

- v1.0.x가 이미 안정적으로 동작
- 전환 비용(75+ 파일 재작성) 대비 체감 이득 없음
- 이미 구축한 CSS 변수 체계가 런타임 문제를 우회
- 실험 가치보다 안정성 유지가 우선

**→ 이 문서는 "차기 프로젝트"를 위한 자산으로 남긴다.**

---

## 0.5. 빠른 시작 & AI 실행 가이드 (TL;DR)

> **이 섹션만 지켜도 80%는 맞다. 나머지 20%는 사람에게 확인한다.**

### 0.5-1. 컴포넌트에서 import 가능한 것 (3개뿐)

```typescript
import { sem } from '@/shared/styles/semantic.css';        // ✅ 색상
import { sprinkles } from '@/shared/styles/sprinkles.css';  // ✅ 레이아웃
import { xxx } from '@/shared/styles/recipes/xxx.css';      // ✅ 공용 variant

// ❌ 절대 금지
import { tokens } from '@/shared/styles/tokens.css';
import { vars } from '@/shared/styles/theme.css';
```

### 0.5-2. 도구 선택 (3줄 규칙)

| 상황 | 도구 |
|---|---|
| **variant가 있다 (primary/secondary, up/down 등)** | **`recipe()`** |
| 동적 런타임 값 (API 응답 기반 색상 등) | `createVar()` + `assignInlineVars()` |
| 그 외 모든 스타일 | `style()` |

**layout(padding, flex, gap)은 `sprinkles()` 또는 `style()` 둘 다 허용.** 기존 패턴을 따르거나 사람이 결정한다.

### 0.5-3. 반드시 지킬 3가지 금지

1. ❌ `style({ color: props.color })` — `.css.ts`에 런타임 값 전달 금지
2. ❌ `sem.text.primaryHover` — semantic에 state 접미사 금지 (`:hover`로)
3. ❌ `sem.spacing.md` — semantic에 layout primitive 금지

### 0.5-4. `.css.ts` 템플릿

**기본 — variant 없는 경우:**

```typescript
import { style } from '@vanilla-extract/css';
import { sem } from '@/shared/styles/semantic.css';

export const wrapper = style({
  background: sem.surface.card,
  color: sem.text.primary,
});
```

**Recipe — variant가 있는 경우:**

```typescript
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { sem } from '@/shared/styles/semantic.css';

export const button = recipe({
  base: { border: 'none', cursor: 'pointer' },
  variants: {
    variant: {
      primary: { background: sem.action.primary, color: sem.text.inverse },
      secondary: { background: sem.bg.surface, color: sem.text.primary },
    },
    size: {
      sm: { height: 28, fontSize: 12 },
      md: { height: 32, fontSize: 13 },
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

export type ButtonVariants = RecipeVariants<typeof button>;
```

### 0.5-5. AI가 사람에게 물어봐야 할 것

- 새 `semantic` 토큰 추가
- 기존 semantic 중 어떤 걸 써야 할지 애매 (primary vs secondary)
- `sprinkles`에 속성 추가
- 규칙 예외 적용
- "이게 중복인가"가 애매할 때
- "variant로 처리할지 별도 컴포넌트로 나눌지" 애매할 때

### 0.5-6. AI가 흔히 하는 실수

| 실수 패턴 | 대신 해야 할 것 |
|---|---|
| `sem.text.muted` 감성 네이밍 | 기존 semantic 재사용 또는 확인 요청 |
| state를 semantic에 올림 (`sem.xxxHover`) | `:hover` 또는 recipe variant |
| `tokens.spacing.md` 직접 import | 안 됨. `sprinkles` 사용 |
| 같은 스타일 블록 여러 파일에 반복 | 2곳+ 발견 즉시 통합 |
| `<div style={{ padding: 8 }} />` | `.css.ts`로 이동 |

### 0.5-7. 확신이 없을 때

> **"모르면 기존 패턴을 따른다."**
> **"확장이 필요해 보이면 기존 것으로 해결 가능한지 먼저 증명한다."**
> **"AI 혼자 결정하지 않는다. 물어본다."**

---

## 1. 레이어 아키텍처 (최우선 원칙)

**모든 스타일 코드는 다음 레이어 중 하나에 속한다. 레이어를 건너뛰는 것은 금지된다.**

### 1-1. 폴더 구조

```
src/shared/styles/
├── tokens.css.ts          # L1: Primitive tokens (색상 원시값, 간격, 반지름)
├── theme.css.ts           # L2: Theme contract + light/dark 매핑
├── semantic.css.ts        # L3: 의미 기반 alias (sem.text.primary 등)
├── sprinkles.css.ts       # L4: Atomic layout utilities
└── recipes/               # L5: 공용 variant 패턴 (Button, Card 등)

src/features/*/components/
└── ComponentName/
    ├── ComponentName.tsx          # 컴포넌트 로직
    └── ComponentName.css.ts       # L6: 컴포넌트 전용 스타일
```

### 1-2. 레이어별 역할과 접근 권한

| 레이어 | 파일 | 역할 | 외부 접근 |
|---|---|---|---|
| **L1 Primitive** | `tokens.css.ts` | raw 값 정의 | **금지** — 컴포넌트 직접 import 불가 |
| **L2 Theme** | `theme.css.ts` | 라이트/다크 테마 contract | **금지** — 컴포넌트 직접 import 불가 |
| **L3 Semantic** | `semantic.css.ts` | 의미 기반 alias | **허용** — 유일한 색상 API |
| **L4 Sprinkles** | `sprinkles.css.ts` | Atomic layout utilities | **허용** — layout 전용 |
| **L5 Recipes** | `recipes/*.css.ts` | 공용 variant | **허용** — 재사용 스타일 |
| **L6 Component** | `*.css.ts` (컴포넌트 옆) | 컴포넌트 전용 | 해당 컴포넌트에서만 |

### 1-3. 접근 규칙

```
tokens  ──→  theme  ──→  semantic  ──→  component.css.ts
                          │
                          ├──→  sprinkles.css.ts
                          └──→  recipes/*.css.ts
```

**레이어 건너뛰기 금지:**

- ❌ 컴포넌트에서 `tokens` 직접 import
- ❌ 컴포넌트에서 `theme` 직접 import
- ❌ `recipes`에서 `tokens` 직접 import
- ✅ 컴포넌트는 `semantic` / `sprinkles` / `recipes`만 import 가능

**공식 예외 — sprinkles는 layout primitive 직접 참조:**

- ✅ `sprinkles.css.ts`는 `tokens.spacing` / `tokens.radius` 등을 직접 참조
- 이유: spacing은 의미가 아닌 크기이므로 semantic 불필요
- 색상은 여전히 semantic 경유 필수

### 1-4. 파일 네이밍 규칙

| 파일 유형 | 네이밍 | 이유 |
|---|---|---|
| 스타일 정의 | `*.css.ts` | Vite 플러그인이 빌드 타임에 CSS로 추출 |
| 스타일 타입/상수 | `*.ts` | 런타임 import 가능 |

**`.css.ts` 파일에는 스타일만 있어야 한다.** 런타임 값 참조하면 빌드 에러.

### 1-5. Semantic 네이밍 원칙 (폭주 방지)

> **semantic은 "도메인 의미"만 표현한다.**
> **단순한 스타일 차이는 semantic으로 만들지 않는다.**

#### 금지 — 스타일 기준 네이밍

```typescript
// ❌ 금지 (명도/채도/감성 기준)
sem.text.gray300
sem.text.light
sem.text.subtle
sem.text.muted
```

#### 허용 — 의미 기반 네이밍

```typescript
// ✅ 허용
sem.text.primary       // "본문 텍스트"
sem.text.secondary     // "보조 텍스트"
sem.text.tertiary      // "캡션/메타 정보"
sem.feedback.up        // "상승 (도메인 의미)"
sem.action.danger      // "위험 액션"
```

#### 단계 기본값과 확장

- `text` 계열 기본 3단계: `primary` / `secondary` / `tertiary`
- 4단계 이상 확장은 **도메인 의미가 명확할 때만 허용**
- 확장 시 해당 단계의 의미를 PR/코멘트에 명시

**확장 예시 (허용):**

```typescript
// ✅ 도메인 의미 명확
sem.text.disabled       // "비활성화된 텍스트"
sem.text.inverse        // "반전 배경 위 텍스트"
sem.text.placeholder    // "입력 안내 텍스트"
```

**확장 금지 예시:**

```typescript
// ❌ 단계 증가용 감성 네이밍
sem.text.quaternary
sem.text.fifth
sem.text.ultra
```

#### 금지 키워드

semantic 이름에 다음 키워드 **포함 금지**:

```
light, dark, gray, grey, subtle, muted, dim, hint, soft, faint, pale
```

#### State 표현 금지

> **semantic은 상태(state)를 표현하지 않는다.**

```typescript
// ❌ 금지
sem.text.primaryHover
sem.action.dangerActive
sem.bg.surfaceFocus
```

**올바른 방법:**

```typescript
// ✅ style의 가상 선택자
export const link = style({
  color: sem.action.primary,
  ':hover': { textDecoration: 'underline' },
});

// ✅ recipe의 variant
export const button = recipe({
  base: { color: sem.text.primary },
  variants: {
    state: {
      default: { color: sem.text.primary },
      hover: { color: sem.text.secondary },  // 기존 semantic 재사용
    },
  },
});
```

### 1-6. Semantic 범위 경계 (layout 분리)

> **spacing · radius · fontSize · z-index 등 layout scale은 semantic에 포함하지 않는다.**
> **layout scale은 primitive(tokens/theme)의 책임이다.**

#### 금지

```typescript
// ❌ 금지 — layout이 semantic에 올라감
sem.spacing.md
sem.spacing.cardPadding
sem.radius.card
sem.fontSize.label
```

#### 허용

```typescript
// ✅ 허용 — primitive 직접 참조
tokens.spacing.md
tokens.radius.lg
tokens.fontSize.base
```

#### 레이어별 담당 범위

| 범주 | 담당 레이어 | 예시 |
|---|---|---|
| 색상 · 시각 표현 | **semantic** | `sem.text.primary` |
| spacing | **tokens/theme** | `tokens.spacing.md` |
| radius | **tokens/theme** | `tokens.radius.lg` |
| fontSize · fontWeight | **tokens/theme** | `tokens.fontSize.base` |
| z-index | **tokens/theme** | `tokens.zIndex.modal` |

### 1-7. 스타일과 비즈니스 로직 분리

**모든 조건 분기를 hooks로 빼는 것은 과하다. "비즈니스 로직"만 분리한다.**

#### hooks/utils로 분리해야 하는 것

- 도메인 공식 (등락률, 시가총액 계산)
- 임계값 판정 (5% 이상 강조)
- 여러 컴포넌트에서 반복되는 판정
- 도메인 용어가 들어가는 파생 상태

#### 컴포넌트에 남겨도 되는 것

```tsx
// ✅ 허용 — 단순 동등 비교
const isActive = selectedId === id;

// ✅ 허용 — 단순 boolean 판정
const isOpen = sheet === 'settings';

// ✅ 허용 — props 기반 단순 분기
const showBadge = Boolean(unread);
```

#### 판단 질문

- "이 로직이 테스트가 필요한가?" YES → hooks/utils
- "다른 컴포넌트에서도 쓰일 가능성?" YES → hooks/utils
- "수정할 때 도메인 지식이 필요한가?" YES → hooks/utils

셋 다 NO면 컴포넌트 내부 허용.

---

## 2. 도구 선택 기준

### 2-1. 결정 트리

```
스타일을 작성하려 한다.
│
├─ variant가 있다 (primary/secondary, up/down 등)?
│   └─ YES → recipe 사용
│
├─ 런타임 값이 필요한가?
│   └─ YES → createVar + assignInlineVars
│
├─ 레이아웃 속성(padding, flex, gap)이고 재사용됨?
│   └─ YES → sprinkles
│
└─ 그 외
    └─ style
```

### 2-2. styleVariants vs recipe

> **판단은 "확장 가능성"이 아니라 "현재 명확히 필요한 축의 수"로 한다.**

| 조건 | 선택 |
|---|---|
| 현재 1축만 필요 | **`styleVariants`** |
| 현재 2축 이상 필요 | `recipe` |
| `compoundVariants`가 현재 필요 | `recipe` |

**"확장 가능성" 논리 금지:**

```typescript
// ❌ 금지 — "나중에 disabled 추가할 수도" 논리
recipe({
  variants: { color: { red: {...}, blue: {...} } },
});

// ✅ 허용 — 현재 1축이므로 styleVariants
export const label = styleVariants({
  red: { color: sem.feedback.down },
  blue: { color: sem.feedback.up },
});
```

승격 시점: 실제로 2축이 필요해지는 시점에 **그때** 승격. YAGNI 원칙.

**예외** — 초기부터 recipe 사용 허용: Button, Input, Card (multi-axis 필요성 이미 명확)

---

## 3. 금지 규칙 (안티패턴)

### ❌ 금지 1 — `.css.ts`에 런타임 값 전달

```typescript
// 금지
style({ color: props.color });
style({ background: someDynamicValue });
```

**올바른 방법:**

```typescript
// A. truly dynamic → createVar + assignInlineVars
const bgVar = createVar();
export const tile = style({ background: bgVar });
<div className={tile} style={assignInlineVars({ [bgVar]: bg })} />

// B. enum 분기 → styleVariants
export const direction = styleVariants({
  up: { color: sem.feedback.up },
  down: { color: sem.feedback.down },
});
```

### ❌ 금지 2 — className 조건 분기 남발

```tsx
// 금지
<button className={clsx(
  base,
  variant === 'primary' && primary,
  size === 'sm' && small,
  disabled && disabledStyle,
)} />
```

**올바른 방법:** recipe로 통합

```typescript
export const button = recipe({
  variants: {
    variant: { primary: {...}, secondary: {...} },
    size: { sm: {...}, lg: {...} },
  },
});
<button className={button({ variant, size })} disabled={disabled} />
```

### ❌ 금지 3 — `tokens` / `theme` 직접 접근

```typescript
// 금지
import { tokens } from '@/shared/styles/tokens.css';
style({ color: tokens.color.red500 });
```

**올바른 방법:**

```typescript
import { sem } from '@/shared/styles/semantic.css';
style({ color: sem.feedback.up });
```

**예외:** `semantic.css.ts` 파일 내부에서만 `tokens`/`theme` 접근 가능.

### ❌ 금지 4 — 중복 스타일 선언

```typescript
// A.css.ts
export const warning = style({ color: '#F04452', fontWeight: 'bold' });
// B.css.ts
export const error = style({ color: '#F04452', fontWeight: 'bold' });
// → 반드시 통합
```

**중복 판단 기준:**

1. 동일 스타일 (속성+값 완전 일치) → 반드시 통합
2. 의미 동일, 속성 다름 → semantic 승격 후 통합
3. 레이아웃 반복 → sprinkles로 강제 통합
4. variant 유사 → recipe로 추출

### ❌ 금지 5 — `inline style` 남용

```tsx
// 금지 (정적 값)
<div style={{ padding: 16, color: '#333' }} />

// 허용 (런타임 동적 값)
<div style={{ background: heatmapColor }} />
<div style={{ transform: `translateX(${x}px)` }} />
```

### ❌ 금지 6 — `.css.ts`에 로직 포함

```typescript
// 금지
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
export const bg = style({ background: isDark ? 'black' : 'white' });
```

**올바른 방법:** theme 분기는 `createTheme`의 영역. 런타임에 className 토글.

### ❌ 금지 7 — 재사용되는 레이아웃을 `style()`에 개별 정의

> **판단 기준은 "속성 종류"가 아니라 "재사용 여부"다.**
> **재사용되는 레이아웃 패턴만 `sprinkles()` 사용 강제. 컴포넌트 내부 전용은 `style()` 허용.**

**금지 (3곳+ 반복):**

```typescript
// A.css.ts, B.css.ts, C.css.ts 각각에
export const row = style({ display: 'flex', alignItems: 'center', gap: 8 });
// → sprinkles로 통합 의무
```

**허용 (1곳 전용):**

```typescript
// StockTile.css.ts — 고유 레이아웃, 재사용 안 됨
export const tileContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minHeight: 64,
});
```

### ❌ 금지 8 — 단일 축 recipe (recipe 남용)

```typescript
// 금지 — 축 1개
recipe({ variants: { color: { red: {...}, blue: {...} } } });

// 허용 — styleVariants로
export const text = styleVariants({
  red: { color: sem.feedback.down },
  blue: { color: sem.feedback.up },
});
```

**강제 규칙:**

- 축이 1개 → `styleVariants`
- 축이 2개 이상 → `recipe`
- `compoundVariants` 필요 → `recipe`

---

## 4. Sprinkles

### 4-1. 도입 이유

- 반복 레이아웃 패턴이 빈번한 프로젝트에 필수
- 매번 `style()`로 만들면 중복 스타일 폭발
- Tailwind 방식의 atomic CSS 재사용

### 4-2. sprinkles.css.ts 정의

**spacing은 semantic이 아닌 primitive(tokens) 직접 참조** (공식 예외):

```typescript
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { tokens } from './tokens.css';

const spacingProperties = defineProperties({
  properties: {
    padding: tokens.spacing,
    paddingTop: tokens.spacing,
    paddingRight: tokens.spacing,
    paddingBottom: tokens.spacing,
    paddingLeft: tokens.spacing,
    margin: tokens.spacing,
    gap: tokens.spacing,
  },
  shorthands: {
    p: ['padding'],
    px: ['paddingLeft', 'paddingRight'],
    py: ['paddingTop', 'paddingBottom'],
    m: ['margin'],
  },
});

const layoutProperties = defineProperties({
  properties: {
    display: ['none', 'flex', 'block', 'inline-flex', 'grid'],
    flexDirection: ['row', 'column'],
    alignItems: ['flex-start', 'center', 'flex-end', 'stretch'],
    justifyContent: ['flex-start', 'center', 'flex-end', 'space-between'],
    flexWrap: ['wrap', 'nowrap'],
  },
});

export const sprinkles = createSprinkles(spacingProperties, layoutProperties);
export type Sprinkles = Parameters<typeof sprinkles>[0];
```

### 4-3. Sprinkles 확장 기준

**sprinkles는 "layout"이 기본이지만, 고정된 scale로 반복되는 primitive는 승격 허용.**

#### 허용 속성

**Tier 1 — 레이아웃 (기본):**
- spacing: padding, margin, gap
- flex/grid: display, flexDirection, alignItems, justifyContent

**Tier 2 — 고정 scale primitive (확장 가능):**
- borderRadius (tokens.radius scale)
- width / height (tokens에 정의된 scale만)

#### 금지 속성

```typescript
// ❌ sprinkles 추가 금지
overflow       // → style
cursor         // → style
opacity        // → style 또는 recipe variant
position       // → style
transform      // → style 또는 inline
boxShadow      // → style
transition     // → style
color          // → style (semantic 필요)
backgroundColor // → style (semantic 필요)
```

#### 승격 3조건

1. 해당 속성이 tokens에 고정 scale로 존재
2. 프로젝트 내 3곳 이상에서 같은 scale 값으로 반복
3. semantic을 거쳐야 하는 속성(color 등)이 아님

---

## 5. 리뷰 체크리스트

**모든 PR은 이 체크리스트를 통과해야 머지 가능.**

### 5-1. 구조 규칙

- [ ] `.css.ts`에 런타임 값이 들어가지 않았다
- [ ] `tokens` / `theme`을 컴포넌트에서 직접 import하지 않았다
- [ ] 새 레이어가 필요한지 검토 완료

### 5-2. 도구 선택

- [ ] enum 분기는 `styleVariants`
- [ ] 2축 이상 variant는 `recipe`
- [ ] 재사용되는 레이아웃은 `sprinkles`
- [ ] 런타임 동적 값은 `createVar` + `assignInlineVars`

### 5-3. 중복 방지

- [ ] 2곳 이상 같은 스타일 블록 선언 없음
- [ ] 재사용 variant는 `recipes/`로 이동
- [ ] `inline style`은 truly dynamic한 경우만

### 5-4. 시맨틱 준수

- [ ] 색상 하드코딩(`#FF0000`, `rgba(...)`) 없음
- [ ] 간격 하드코딩(`padding: 16`) 없음
- [ ] layout primitive를 semantic에 올리지 않음
- [ ] 의미 있는 네이밍

### 5-5. 타입 안전성

- [ ] `recipe`의 variant 타입이 컴포넌트 props와 연결됨
- [ ] `sprinkles`의 반환 타입 `Sprinkles` export

---

## 6. ESLint 강제 규칙

### 6-1. 레이어 import 제한

```js
{
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/shared/styles/tokens.css', '@/shared/styles/theme.css'],
        message: 'tokens/theme 직접 접근 금지. semantic 레이어를 사용하세요.',
      }],
    }],
  },
},
{
  files: ['src/shared/styles/semantic.css.ts'],
  rules: { 'no-restricted-imports': 'off' },
}
```

### 6-2. inline style 값 패턴 제한

```js
{
  rules: {
    'no-restricted-syntax': ['error', {
      selector: 'JSXAttribute[name.name="style"] > JSXExpressionContainer > ObjectExpression > Property[value.type="Literal"]',
      message: '정적 값 inline style 금지. sprinkles 또는 .css.ts의 style() 사용.',
    }],
  },
}
```

정적 리터럴만 차단. 변수/표현식은 통과.

### 6-3. 다른 CSS-in-JS 라이브러리 차단

```js
{
  rules: {
    'no-restricted-syntax': ['error',
      {
        selector: 'TaggedTemplateExpression[tag.name="css"]',
        message: 'CSS 템플릿 사용 금지. .css.ts의 style() 사용.',
      },
      {
        selector: 'ImportDeclaration[source.value=/@emotion|styled-components/]',
        message: '다른 CSS-in-JS 라이브러리 사용 금지.',
      },
    ],
  },
}
```

### 6-4. semantic 네이밍 금지 키워드

```js
{
  files: ['src/shared/styles/semantic.css.ts'],
  rules: {
    'no-restricted-syntax': ['error', {
      selector: 'Property[key.name=/^(light|dark|gray|grey|subtle|muted|dim|hint|soft|faint|pale)$/]',
      message: 'semantic 네이밍에 스타일 키워드 사용 금지.',
    }],
  },
}
```

**핵심 원칙:**

> **sprinkles/recipe 강제는 lint 없이 의미 없다.**
> **lint로 막지 못하는 규칙은 결국 지켜지지 않는다.**

---

## 7. 실전 주의사항

**실제 서비스 도입 사례에서 발견된 함정.**

### 7-1. 빌드 파이프라인에서 CSS 소실

**증상**: dev에서는 정상, 프로덕션 빌드 후 스타일 사라짐.
**원인**: CSS 최적화 플러그인(PurgeCSS 등)이 VE 생성 CSS를 "미사용"으로 오인하여 제거.
**대응**: 프로덕션 빌드 후 CSS 파일에 예상 클래스 존재 확인. 필요 시 최적화 플러그인 설정 점검.

### 7-2. `assignInlineVars` 남용 금지

`@vanilla-extract/dynamic`은 편리하지만 과용하면 런타임 비용 발생.

> **"API에서 내려오는 동적 값" 같이 빌드 타임에 예측 불가능한 경우에만 사용.**

```tsx
// ✅ 허용 — 서버 응답 기반 동적 색상
<div style={assignInlineVars({ [bgVar]: heatmapColor })} />

// ❌ 금지 — variant로 표현 가능한 것
<div style={assignInlineVars({ [colorVar]: isActive ? 'red' : 'blue' })} />
```

### 7-3. `globalStyle` 남용 금지

허용: HTML/body reset, 스크롤바, 글로벌 폰트, `*` 초기화.
금지: 컴포넌트 스타일, 특정 클래스명 타깃팅.

### 7-4. 외부 CSS와 혼재 금지

외부 CSS 파일(CSS Modules, SCSS 등)과 VE 혼용 시 우선순위 예측 불가.
**원칙:** 모든 CSS는 `.css.ts` 기반으로 통일.

### 7-5. `createVar` 초기값

```typescript
// ❌ 초기값 없으면 undefined 가능
const bgVar = createVar();
style({ background: bgVar });

// ✅ fallback 명시
style({ background: fallbackVar(bgVar, 'transparent') });
```

### 7-6. `lineHeight` 단위 주의

```typescript
// ⚠️ 숫자는 경우에 따라 px로 변환될 수 있음
style({ lineHeight: 1.5 });

// ✅ 명시적 문자열
style({ lineHeight: '1.5' });
```

---

## 8. 예외 처리 규칙

### 8-1. 규칙을 어겨야 할 때

**반드시 코드에 주석으로 이유 명시.**

```typescript
// 예외: WebView overlay는 빌드 타임에 결정 불가능한 외부 크기 참조
const overlay = {
  width: webviewSize.width,  // eslint-disable-next-line
};
```

### 8-2. 예외 승인 프로세스

1. PR 본문에 "규칙 예외 사유" 섹션 작성
2. 대안이 왜 안 되는지 구체적으로 설명
3. 리뷰어 승인 필요 (개인 프로젝트에서는 24시간 후 재검토)

---

## 9. 시스템 변경 규칙 (Governance)

**"처음 설계"보다 "지속적으로 무너지지 않게 유지"가 더 어렵다.**
**디자인 시스템은 자유롭게 수정 가능한 코드가 아니라, 명시적 승인 하에만 변경 가능한 "시스템"이다.**

### 9-1. 변경 원칙

> **코드가 규칙을 바꾸지 않는다. 규칙이 코드를 바꾼다.**

- 이 문서가 시스템의 **진실의 원천**
- 문서와 코드 충돌 시 **문서를 먼저 수정**
- 개인 판단으로 규칙 우회 금지

### 9-2. 변경이 필요한 경우

- 기존 규칙으로 해결 불가능한 문제 발생 (대안 증명 필요)
- 반복되는 예외가 3회 이상 발생
- 성능 문제 또는 DX 저하가 명확히 입증

### 9-3. 변경 절차 (RFC)

변경은 일반 PR이 아닌 **RFC 문서 기반**:

#### 1단계 — RFC 작성

```markdown
## 문제 상황
- 구체적 사례 (최소 3개)
- 재현 방법

## 기존 규칙으로 해결 불가능한 이유
- 시도한 대안과 실패 원인

## 제안하는 변경
- 정확한 규칙 변경 내용
- 영향받는 문서 섹션

## 대안 비교 (최소 2개)
- 대안 A vs 대안 B
- trade-off 분석

## 기존 시스템에 미치는 영향
- 마이그레이션 범위
- 리뷰 체크리스트 영향
```

#### 2단계 — 유예 기간

RFC 작성 후 최소 24시간. 다른 시각으로 재검토.

#### 3단계 — 승인 후 적용 순서

1. **문서 먼저** 수정
2. **ESLint 규칙** 업데이트
3. **코드 마이그레이션**
4. **PR 생성** — 3단계를 하나의 PR로

### 9-4. 절대 금지 사항

| 금지 | 이유 |
|---|---|
| 코드 먼저 수정, 문서 나중에 | 진실의 원천 소실 |
| 개인 판단으로 규칙 우회 | "한 번만"이 반복되면 붕괴 |
| "편해서" 또는 "나중에 복잡해질 것 같아서" 변경 | 확장 가능성 논리는 함정 |
| RFC 없이 semantic 추가 | 감성 네이밍의 시작점 |
| RFC 없이 sprinkles 속성 추가 | layout 개념 오염 |

### 9-5. AI 협업 시 특별 주의

**AI는 이 거버넌스 규칙을 스스로 지키지 못한다.** 사람이 반드시 확인:

- [ ] AI가 제안한 변경이 기존 규칙 안에서 해결 가능한지
- [ ] AI가 "편한 방법"으로 semantic/sprinkles/recipe를 확장하려 하는지
- [ ] 변경이 필요하면 AI에게 RFC 작성부터 요청

**AI는 구현 파트너이지 시스템 설계자가 아니다.**

---

## 10. 참고 자료

### 공식 문서

- [Vanilla Extract — Getting Started](https://vanilla-extract.style/documentation/getting-started/)
- [Theming](https://vanilla-extract.style/documentation/theming/)
- [Styling API](https://vanilla-extract.style/documentation/styling/)
- [Recipes](https://vanilla-extract.style/documentation/packages/recipes/)
- [Sprinkles](https://vanilla-extract.style/documentation/packages/sprinkles/)
- [Dynamic](https://vanilla-extract.style/documentation/packages/dynamic/)

### 실전 사례

- [Catchtable B2C — Vanilla Extract 도입기](https://medium.com/catchtable/how-to-use-vanilla-extract-in-catchtable-b2c-6c4e712c471f)

### 이 문서의 출처

이 기준서는 Stock Orbit 프로젝트에서 Emotion 기반 디자인 시스템을 구축하며 겪은 시행착오와, Vanilla Extract 도입을 검토하면서 정리한 설계 원칙을 통합한 것이다.

다음 프로젝트에서 처음부터 이 원칙을 적용한다면, Stock Orbit에서 우회 설계로 해결했던 문제들을 구조적으로 예방할 수 있다.
