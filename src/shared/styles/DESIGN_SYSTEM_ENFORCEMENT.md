# 디자인 시스템 강제 레이어

> v3 디자인 시스템 위에 올리는 강제 레이어.
> 목표: **실수 자체를 할 수 없는 구조.**

---

## 1. ESLint 커스텀 규칙

AST(구문 트리)를 분석하여 코드 작성 시점에 위반을 잡아내는 5개의 커스텀 규칙.

### 1-1. 색상 하드코딩 금지

`#FF0000`, `rgba(...)` 같은 하드코딩된 색상값을 금지한다.
반드시 `sem.*` 토큰을 사용해야 한다.

```js
// eslint-rules/no-hardcoded-colors.js
// 탐지 대상: #hex, rgb(), rgba(), hsl(), hsla()
// 예외 파일: theme.ts, semantic.ts, global.ts, vars.ts, tokens.ts (토큰 정의 파일)
```

```ts
// 금지 — ESLint 에러
css`background: #1A1B20;`
css`color: rgba(0,0,0,0.5);`

// 허용 — 시맨틱 토큰 사용
css`background: ${sem.bg.base};`
css`color: ${sem.overlay.dim};`
```

### 1-2. 간격(spacing) 하드코딩 금지

`padding: 16px` 같은 하드코딩된 px값을 금지한다.
반드시 `spacing.*` 또는 `sp()` 유틸을 사용해야 한다.

```js
// eslint-rules/no-hardcoded-spacing.js
// 탐지 대상: padding, margin, gap 속성의 하드코딩 px값
// 예외 값: 0px, 1px, 2px (미세 보정용)
// 예외 파일: tokens.ts, global.ts
```

```ts
// 금지 — ESLint 경고
css`padding: 16px;`
css`margin: 24px 12px;`

// 허용 — 토큰 사용
css`padding: ${spacing.xl}px;`
css`margin: ${sp('3xl', 'lg')};`
```

### 1-3. CSS 변수 직접 사용 금지

`var(--c-text)` 같은 CSS 변수를 컴포넌트에서 직접 쓰는 것을 금지한다.
반드시 `sem.*`을 거쳐야 한다 (sem 내부가 이미 var() 참조를 담고 있음).

```js
// eslint-rules/no-direct-css-var.js
// 탐지 대상: var(--c-*) 패턴
// 예외 파일: vars.ts, semantic.ts, global.ts, sharedStyles.ts
```

```ts
// 금지
css`color: var(--c-text);`

// 허용
css`color: ${sem.text.primary};`  // 내부적으로 var(--c-text)와 동일
```

### 1-4. 문자열 alpha 결합 금지

`v.accent + '20'` 같은 16진수 투명도 결합을 금지한다.
사전 정의된 tint 토큰을 사용해야 한다.

```js
// eslint-rules/no-alpha-concat.js
// 탐지 대상: something + '15', something + 'A0' 같은 2자리 hex 결합
```

```ts
// 금지
css`background: ${v.accent + '20'};`

// 허용 — 사전 정의된 tint 토큰
css`background: ${sem.action.primaryHover};`  // accent 25% 투명도
```

### 1-5. ESLint 설정 등록

```js
// eslint.config.js (flat config)
rules: {
  'stock-orbit/no-hardcoded-colors':  'error',  // 색상 하드코딩 → 에러
  'stock-orbit/no-hardcoded-spacing': 'warn',   // 간격 하드코딩 → 경고
  'stock-orbit/no-direct-css-var':    'error',  // var() 직접 사용 → 에러
  'stock-orbit/no-alpha-concat':      'error',  // alpha 결합 → 에러
}
```

---

## 2. 스타일 팩토리 (createStyled)

### 2-1. 개요

`sem`과 `tokens`만 접근 가능한 스타일 생성 함수.
콜백 인자로 토큰 컨텍스트만 주입하므로, raw 값을 직접 사용할 수 없다.

```ts
// shared/styles/createStyled.ts

interface StyleContext {
  sem: typeof sem;          // 시맨틱 토큰 (색상, 배경, 테두리 등)
  spacing: typeof spacing;  // 여백/간격 (xs=2, sm=4, ... 6xl=48)
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  radius: typeof radius;
  height: typeof height;
  transition: typeof transition;
  shadow: typeof shadow;
}

export const createStyled = <T extends Record<string, SerializedStyles>>(
  factory: (ctx: StyleContext) => T
): T => factory(ctx);
```

### 2-2. 사용 예시

```ts
// 허용 — 토큰만 사용
const s = createStyled(({ sem, spacing, radius, fontSize }) => ({
  card: css`
    background: ${sem.surface.card};
    border: 1px solid ${sem.border.default};
    border-radius: ${radius.xl}px;
    padding: ${spacing.xl}px;
    font-size: ${fontSize.base}px;
  `,
}));

// 금지 — ESLint가 잡음
const s = createStyled(() => ({
  card: css`
    background: #1A1B20;           // no-hardcoded-colors 위반
    padding: 16px;                  // no-hardcoded-spacing 위반
    color: var(--c-text);           // no-direct-css-var 위반
  `,
}));
```

### 2-3. 동적 스타일 (상태 기반)

컴포넌트 토큰(componentTokens.ts)에서 상태별 값을 가져와 적용하는 패턴.
variant × state 조합의 모든 값이 사전 정의되어 있으므로 임의 색상 사용이 불가능하다.

```ts
import { buttonTokens, buttonSizes } from './componentTokens';

const s = createStyled(({ sem, radius, transition }) => ({
  btn: (variant: ButtonVariant, size: ButtonSize) => {
    const t = buttonTokens[variant];   // primary/secondary/ghost/danger
    const sz = buttonSizes[size];       // sm/md/lg
    return css`
      height: ${sz.height}px;
      background: ${t.default.bg};
      &:hover { background: ${t.hover.bg}; }
    `;
  },
}));
```

---

## 3. 토큰 접근 제한

### 3-1. 파일 구조와 접근 권한

```
shared/styles/
├── tokens.ts          ← 내부 전용 (컴포넌트에서 직접 import 금지)
├── vars.ts            ← 내부 전용 (CSS 변수 참조 — sem이 래핑)
├── theme.ts           ← 내부 전용 (라이트/다크 색상 정의)
├── semantic.ts        ← 유일한 공개 색상 API
├── componentTokens.ts ← 컴포넌트 상태별 토큰 (버튼, 카드, 인풋 등)
├── createStyled.ts    ← 스타일 팩토리
├── sharedStyles.ts    ← 공유 스타일 (그룹 헤더, 섹션 타이틀 등)
├── global.ts          ← 글로벌 스타일 (앱 진입점 전용)
└── index.ts           ← 공개 barrel (외부에 노출할 것만 export)
```

### 3-2. 공개 API (index.ts)

```ts
// 컴포넌트에서 import 가능한 것들만 노출
export { sem } from './semantic';
export { createStyled } from './createStyled';
export { sectionTitleStyle, groupHeaderStyle } from './sharedStyles';
export { buttonTokens, cardTokens, inputTokens, ... } from './componentTokens';

// tokens, vars, theme은 여기서 export하지 않음
// → 컴포넌트가 내부 토큰에 직접 접근하는 것을 구조적으로 차단
```

### 3-3. ESLint import 제한

```js
// vars.ts, theme.ts를 컴포넌트에서 직접 import하면 에러
'no-restricted-imports': ['error', {
  patterns: [
    { group: ['@/shared/styles/vars'],  message: 'sem.*을 사용하세요.' },
    { group: ['@/shared/styles/theme'], message: 'sem.*을 사용하세요.' },
  ],
}]
```

### 3-4. 예외 허용 파일

스타일 인프라 내부, 공유 UI 컴포넌트, 테마 프로바이더는 예외적으로 내부 토큰에 접근 가능.

```js
// eslint.config.js — overrides
{
  files: [
    'src/shared/styles/**/*.ts',   // 스타일 인프라 내부
    'src/shared/ui/**/*.tsx',       // 공유 UI 컴포넌트 (레이아웃 기반)
    'src/app/providers/**/*.tsx',   // 테마 프로바이더
  ],
  rules: {
    'no-restricted-imports': 'off',
    'stock-orbit/no-direct-css-var': 'off',
    'stock-orbit/no-hardcoded-colors': 'off',
  },
}
```

---

## 4. 제로 런타임 테마 시스템

### 4-1. 구조

```
theme.ts → themeToVars() → :root { --c-text: #191F28; ... }
                            CSS 변수 교체만으로 테마 전환
                            React 리렌더 0건
```

### 4-2. 테마 전환 동작 원리

```
1. Global styles가 :root의 CSS 변수를 교체 (--c-text, --c-bg, ...)
2. 모든 컴포넌트 스타일은 css`` 안에서 var(--c-*) 참조
3. CSS 변수 값이 바뀌면 브라우저가 자동으로 화면 업데이트 (CSSOM)
4. React 컴포넌트는 리렌더되지 않음 — props/state가 변하지 않았으므로

유일한 리렌더: ThemeProvider 자신 (Global styles 교체)
자식 컴포넌트: 0건
```

### 4-3. semantic.ts가 var() 기반인 이유

```ts
// sem.action.primary = v.accent = 'var(--c-accent)'
//
// css`color: ${sem.action.primary}`
// → css`color: var(--c-accent)`
// → 문자열 치환 — 런타임 비용 0
//
// 만약 sem이 실제 색상값('#4593FC')을 가졌다면?
// → 테마 전환 시 sem 객체를 새로 생성해야 함
// → 모든 컴포넌트가 리렌더됨 (성능 문제)
```

---

## 5. 시각적 회귀 테스트 (Visual Regression)

### 5-1. Storybook 구조

```
src/shared/ui/__stories__/
├── Button.stories.tsx
├── Card.stories.tsx
├── Input.stories.tsx
├── IconButton.stories.tsx
├── Toggle.stories.tsx
├── SegmentedControl.stories.tsx
├── Toast.stories.tsx
└── TimelineRow.stories.tsx
```

### 5-2. 상태별 테스트 매트릭스

각 컴포넌트의 variant × state × theme 조합을 모두 커버:

| 컴포넌트 | 스토리 수 |
|----------|----------|
| Button | 4종류 × 3크기 × 2상태(기본, 비활성) × 2테마 = 48 |
| Card | 2종류 × 2테마 = 4 |
| Input | 4상태(기본, 포커스, 캡처링, 비활성) × 2테마 = 8 |
| IconButton | 4종류 × 2상태 × 2테마 = 16 |
| Toggle | 3상태 × 2테마 = 6 |
| SegmentedControl | 2크기 × 2테마 = 4 |
| **합계** | **86개 스토리** |

### 5-3. 스냅샷 테스트

variant × size 조합별로 렌더링 결과를 스냅샷으로 저장하고,
이후 변경 시 차이를 자동 감지한다.

```ts
describe('Button 시각적 스냅샷', () => {
  VARIANTS.forEach(variant => {
    SIZES.forEach(size => {
      it(`${variant}/${size}`, () => {
        const { container } = render(
          <Button variant={variant} size={size}>Label</Button>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });
});
```

### 5-4. 변경 감지 전략

| 변경 유형 | 감지 방법 |
|-----------|----------|
| 토큰 값 변경 (`tokens.ts`) | 시각적 diff — 모든 컴포넌트에 영향 |
| 테마 색상 변경 (`theme.ts`) | 시각적 diff — 해당 테마 스토리 |
| 컴포넌트 스타일 변경 | 시각적 diff — 해당 컴포넌트 스토리 |
| 시맨틱 매핑 변경 | 시각적 diff — 사용처 전체 |
| 새 컴포넌트 추가 | 새 스토리 필수 (PR 체크) |

---

## 6. 강제 레이어 전체 흐름

```
                         ┌─────────────────────┐
                         │    PR / 커밋          │
                         └────────┬────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
             ┌──────────┐  ┌──────────┐  ┌──────────────┐
             │  ESLint   │  │TypeScript │  │  런타임 가드  │
             │  정적 분석 │  │  컴파일    │  │ (개발 모드)   │
             └──────────┘  └──────────┘  └──────────────┘
              색상/간격       금지 조합      조합 규칙
              하드코딩 차단   타입 불일치    (primary in card 등)
              var() 직접 차단
              alpha 결합 차단
                    │             │              │
                    ▼             ▼              ▼
             ┌──────────────────────────────────────┐
             │            CI 파이프라인               │
             ├──────────────────────────────────────┤
             │  1. ESLint 검사                       │
             │  2. TypeScript 컴파일                  │
             │  3. 단위 테스트 (vitest)               │
             │  4. 시각적 회귀 테스트 (Chromatic)      │
             └──────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    머지 허용       │
                    └──────────────────┘
```

| 레이어 | 잡아내는 것 | 시점 |
|--------|-----------|------|
| TypeScript | 금지된 variant 조합, 잘못된 props 타입 | 컴파일 시 |
| ESLint | 하드코딩 색상/간격, var() 직접 사용, alpha 결합 | 린트 시 |
| 런타임 가드 | 조합 규칙 (카드 안의 primary, 세그먼트 크기 불일치) | 개발 런타임 |
| Chromatic | 토큰/스타일 변경에 의한 시각적 차이 | PR 리뷰 시 |
| 스냅샷 | 예상치 못한 렌더링 결과 변경 | 테스트 시 |
