# Stock Orbit 코드로 배우는 React + Electron

이 문서는 Stock Orbit 프로젝트의 실제 코드를 기반으로, React 경험이 전혀 없는 사람도 이해할 수 있도록 핵심 문법과 패턴을 설명합니다.

---

## 목차

1. [프로젝트 구조 한눈에 보기](#1-프로젝트-구조-한눈에-보기)
2. [React의 기본 개념](#2-react의-기본-개념)
3. [JSX — HTML처럼 생긴 JavaScript](#3-jsx--html처럼-생긴-javascript)
4. [컴포넌트 — UI를 조립하는 블록](#4-컴포넌트--ui를-조립하는-블록)
5. [Props — 부모가 자식에게 데이터 전달](#5-props--부모가-자식에게-데이터-전달)
6. [useState — 컴포넌트의 기억 장치](#6-usestate--컴포넌트의-기억-장치)
7. [useEffect — 외부 세계와 동기화](#7-useeffect--외부-세계와-동기화)
8. [useMemo / useCallback — 불필요한 재계산 방지](#8-usememo--usecallback--불필요한-재계산-방지)
9. [useRef — 렌더링 없이 값 저장](#9-useref--렌더링-없이-값-저장)
10. [커스텀 훅 — 로직을 재사용 가능한 함수로 추출](#10-커스텀-훅--로직을-재사용-가능한-함수로-추출)
11. [Context API — 전역 데이터 공유](#11-context-api--전역-데이터-공유)
12. [Zustand — 전역 상태 관리](#12-zustand--전역-상태-관리)
13. [React Query — 서버 데이터 자동 관리](#13-react-query--서버-데이터-자동-관리)
14. [Emotion — JavaScript로 CSS 작성](#14-emotion--javascript로-css-작성)
15. [디자인 토큰과 테마 시스템](#15-디자인-토큰과-테마-시스템)
16. [TypeScript — 타입으로 코드 안전망 만들기](#16-typescript--타입으로-코드-안전망-만들기)
17. [Electron — 웹 기술로 데스크톱 앱 만들기](#17-electron--웹-기술로-데스크톱-앱-만들기)
18. [실전 아키텍처 패턴](#18-실전-아키텍처-패턴)
19. [API 통신과 Rate-Limit 처리](#19-api-통신과-rate-limit-처리)
20. [에러 처리 전략](#20-에러-처리-전략)

---

## 1. 프로젝트 구조 한눈에 보기

```
stock-orbit/
├── electron/                 ← Electron (데스크톱 앱 프레임)
│   ├── main.js              ← 메인 프로세스 (창, 트레이, IPC)
│   └── preload.js           ← 보안 브릿지 (React ↔ Electron 연결)
│
├── src/                      ← React 앱 소스코드
│   ├── main.tsx             ← 엔트리포인트 (앱을 DOM에 마운트)
│   ├── app/                 ← 앱 레벨 설정
│   │   ├── App.tsx          ← 최상위 컴포넌트 (레이아웃 배치)
│   │   ├── store/           ← Zustand 전역 상태
│   │   ├── providers/       ← React Query 등 Provider
│   │   └── SheetManager.tsx ← 모달/시트 통합 관리
│   │
│   ├── features/             ← 기능별 모듈
│   │   ├── stock/           ← 주식 표시 (리스트, 그리드, 타일)
│   │   ├── search/          ← 종목 검색
│   │   ├── ranking/         ← 시장 랭킹
│   │   ├── news/            ← 뉴스 · AI 브리핑
│   │   ├── marquee/         ← 실시간 티커
│   │   └── settings/        ← 앱 설정
│   │
│   └── shared/               ← 공유 코드
│       ├── types/           ← TypeScript 타입 정의
│       ├── styles/          ← 디자인 토큰, 테마
│       ├── ui/              ← 공용 UI 컴포넌트
│       ├── hooks/           ← 공용 커스텀 훅
│       ├── utils/           ← 유틸 함수 (포맷, 로깅)
│       └── naver.ts         ← 네이버 API 클라이언트
│
└── package.json              ← 의존성 및 빌드 설정
```

**핵심 원칙: 기능(feature) 단위로 폴더를 나눈다.**

`components/`, `hooks/` 같은 "타입별 폴더"가 아니라, `stock/`, `search/` 같은 "기능별 폴더" 안에 각각의 components, hooks, utils를 둔다. 관련 코드가 한 곳에 모여 있어서 기능 하나를 수정할 때 여러 폴더를 오갈 필요가 없다.

---

## 2. React의 기본 개념

React는 UI를 만드는 JavaScript 라이브러리다. 핵심 아이디어는 딱 하나:

> **"데이터가 바뀌면 화면이 자동으로 바뀐다."**

전통적인 웹 개발에서는 데이터가 바뀔 때 DOM을 직접 조작해야 했다:

```javascript
// 전통 방식: 직접 DOM 조작
document.getElementById('price').textContent = '75,000원';
document.getElementById('price').className = priceUp ? 'red' : 'blue';
```

React에서는 "데이터(상태)"만 바꾸면 화면이 알아서 갱신된다:

```tsx
// React 방식: 상태만 바꾸면 UI가 자동 갱신
const [price, setPrice] = useState(75000);
return <span className={price > prev ? 'red' : 'blue'}>{price.toLocaleString()}원</span>;
```

이 프로젝트의 엔트리포인트 `src/main.tsx`를 보자:

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from './app/providers/QueryProvider';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </React.StrictMode>,
);
```

한 줄씩 풀어보면:
- `ReactDOM.createRoot(...)` — HTML에 있는 `<div id="root">`를 찾아서 React가 관리할 영역으로 지정
- `.render(...)` — 그 영역에 `<App />` 컴포넌트를 그림
- `<React.StrictMode>` — 개발 모드에서 잠재적 문제를 미리 경고해주는 래퍼
- `<QueryProvider>` — 서버 데이터 관리(React Query)를 앱 전체에서 사용할 수 있게 감싸줌

---

## 3. JSX — HTML처럼 생긴 JavaScript

React에서는 **JSX**라는 문법으로 UI를 작성한다. HTML 같지만 JavaScript다.

```tsx
// App.tsx 일부
return (
  <div css={s.app}>
    <TitleBar isDark={isDark} opacity={settings.opacity} onClose={handleClose} />
    <MarqueeTicker items={marqueeItems} speed={settings.tickerSpeed} />
    <PresetTabs presets={presets} activeId={activeId} onSelect={setActiveId} />
    <StockViewSwitch />
    <StatusBar lastUpdated={lastUpdated} loading={dataLoading} />
  </div>
);
```

**JSX의 핵심 규칙:**

| HTML | JSX | 이유 |
|------|-----|------|
| `class="box"` | `className="box"` | `class`는 JS 예약어 |
| `<br>` | `<br />` | 모든 태그를 닫아야 함 |
| `style="color:red"` | `style={{ color: 'red' }}` | 객체 형태로 전달 |
| — | `{변수}` | 중괄호 안에 JS 표현식 사용 가능 |

**중괄호 `{}`는 "여기서 JavaScript를 실행한다"는 표시다:**

```tsx
// 변수 출력
<span>{vm.priceLabel}</span>

// 삼항 연산자 (if-else의 축약형)
<span>{price > 0 ? '▲' : '▼'}</span>

// 논리 AND (조건부 렌더링)
{isLive && <span>LIVE</span>}

// 배열을 리스트로 변환
{symbols.map(sym => (
  <StockRow key={sym.code} sym={sym} />
))}
```

**`map`으로 리스트 만들기** — 배열의 각 요소를 JSX로 변환:

```tsx
// symbols = [{code: '005930', name: '삼성전자'}, {code: 'AAPL.O', name: 'Apple'}]
// ↓ 이렇게 변환됨
{symbols.map(sym => (
  <StockRow key={sym.code} sym={sym} price={prices[sym.code]} />
))}
// 결과:
// <StockRow key="005930" sym={삼성전자} price={...} />
// <StockRow key="AAPL.O" sym={Apple} price={...} />
```

> `key`는 필수다. React가 리스트의 어떤 항목이 변했는지 효율적으로 추적하기 위해 사용한다. 종목 코드처럼 **고유한 값**이어야 한다.

---

## 4. 컴포넌트 — UI를 조립하는 블록

컴포넌트는 **재사용 가능한 UI 조각**이다. 함수로 만든다.

```tsx
// 가장 단순한 컴포넌트
const StatusLabel = () => {
  return <span>LIVE</span>;
};
```

이 프로젝트의 `App` 컴포넌트는 레이아웃 배치만 담당한다:

```tsx
// src/app/App.tsx
const AppContent = () => {
  // ... 상태와 로직 (후술)

  return (
    <>
      <Global styles={globalStyles(theme, isDark)} />
      <div css={s.app}>
        <TitleBar ... />        {/* 상단 바 */}
        <MarqueeTicker ... />   {/* 실시간 티커 */}
        <PresetTabs ... />      {/* 그룹 탭 */}
        <StockViewSwitch />     {/* 종목 리스트/그리드/타일 */}
        <StatusBar ... />       {/* 하단 바 */}
        <SheetManager ... />    {/* 모달/시트들 */}
      </div>
    </>
  );
};
```

- `<> </>` — **Fragment**. 여러 요소를 하나로 감싸되, 실제 DOM에는 나타나지 않는 투명 래퍼
- 각 `<TitleBar />`, `<MarqueeTicker />` 등은 별도 파일에 정의된 컴포넌트
- 이렇게 조합하면 레고 블록 쌓듯이 복잡한 UI를 만들 수 있다

**컴포넌트를 내보내고 가져오기:**

```tsx
// 정의 (features/marquee/index.ts)
export const MarqueeTicker = ({ items, speed }) => { ... };

// 사용 (app/App.tsx)
import { MarqueeTicker } from '@/features/marquee';
```

---

## 5. Props — 부모가 자식에게 데이터 전달

Props는 컴포넌트에 전달하는 **입력값**이다. HTML 속성처럼 쓴다.

```tsx
// 부모가 자식에게 데이터를 건네줌
<TitleBar
  isDark={isDark}               // boolean (true/false)
  opacity={settings.opacity}    // number (0.95)
  onClose={handleClose}         // function (콜백)
/>
```

자식 컴포넌트에서 받아서 사용:

```tsx
// TitleBar 컴포넌트
const TitleBar = ({ isDark, opacity, onClose }) => {
  return (
    <div>
      <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      <button onClick={onClose}>X</button>
    </div>
  );
};
```

이 프로젝트에서는 **TypeScript로 props 타입을 명시**한다:

```tsx
// SheetManager.tsx
interface Props {
  marqueeItems: MarqueeItem[];  // MarqueeItem 배열만 받겠다고 선언
}

export const SheetManager = memo(({ marqueeItems }: Props) => {
  // marqueeItems는 반드시 MarqueeItem[] 타입
});
```

**왜 props를 쓰나?**
- 컴포넌트를 **독립적**으로 만들기 위해
- `TitleBar`는 "자기가 다크모드인지"를 직접 알 필요 없다 — 부모가 알려주면 된다
- 이렇게 하면 같은 `TitleBar`를 다른 곳에서 다른 설정으로 재사용할 수 있다

---

## 6. useState — 컴포넌트의 기억 장치

`useState`는 컴포넌트가 **데이터를 기억하고, 바꿀 수 있게** 해준다.

```tsx
// Toast.tsx
const [toasts, setToasts] = useState<ToastItem[]>([]);
//     ↑ 현재 값    ↑ 값을 바꾸는 함수              ↑ 초기값 (빈 배열)
```

**동작 원리:**
1. `useState([])` → `toasts`의 초기값은 빈 배열
2. `setToasts([...])` 호출 → `toasts` 값이 바뀜 → 컴포넌트가 자동으로 **다시 그려짐**
3. 다시 그려질 때 `toasts`는 새 값을 가지고 있음

**실제 사용 예: Toast 알림 시스템**

```tsx
// src/shared/ui/Toast.tsx
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    // 새 토스트를 추가
    setToasts([{ id, message, type }]);
    // 2.4초 뒤 자동 제거
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* 토스트 UI 렌더링 */}
      {toasts.map(t => (
        <div key={t.id}>{t.message}</div>
      ))}
    </ToastContext.Provider>
  );
};
```

`setToasts`의 두 가지 사용법:

```tsx
// 1. 새 값을 직접 전달
setToasts([{ id: 1, message: '완료', type: 'success' }]);

// 2. 함수를 전달 (이전 값을 기반으로 계산)
setToasts(prev => prev.filter(t => t.id !== id));
//         ↑ 이전 상태를 인자로 받음
```

**중요:** `setState`를 호출하면 React가 컴포넌트를 다시 렌더링한다. 이것이 "데이터가 바뀌면 UI가 자동 갱신된다"의 실체다.

---

## 7. useEffect — 외부 세계와 동기화

`useEffect`는 **컴포넌트 외부의 시스템과 동기화**할 때 사용한다.
"이벤트 리스너 등록/해제", "API 호출", "타이머 설정" 같은 작업이 여기에 해당한다.

```tsx
useEffect(() => {
  // 실행할 코드 (마운트 시 + 의존성 변경 시)

  return () => {
    // 정리(cleanup) 코드 (언마운트 시 + 다음 실행 전)
  };
}, [의존성1, 의존성2]);  // 이 값들이 바뀔 때만 재실행
```

**실제 사용 예 1: 이벤트 리스너 등록/해제**

```tsx
// src/shared/hooks/useBackAction.ts
export const useBackAction = (active: boolean, onBack: () => void) => {
  useEffect(() => {
    if (!active) return;        // 비활성이면 아무것도 안 함
    backStack.push(onBack);     // ESC 핸들러 스택에 등록
    return () => {              // 정리: 스택에서 제거
      const idx = backStack.lastIndexOf(onBack);
      if (idx !== -1) backStack.splice(idx, 1);
    };
  }, [active, onBack]);         // active나 onBack이 바뀔 때만 재실행
};
```

**실제 사용 예 2: Electron 이벤트 구독**

```tsx
// Electron의 업데이트 이벤트 구독
useEffect(() => {
  // 구독 시작 — "업데이트가 있으면 알려줘"
  const unsubscribe = window.electronAPI?.onUpdateAvailable(({ version }) => {
    setUpdateAvailable(version);
  });
  // 컴포넌트가 사라질 때 구독 해제 (메모리 누수 방지)
  return () => unsubscribe?.();
}, []);
//  ↑ 빈 배열 = 마운트 시 1번만 실행
```

**의존성 배열의 의미:**

```tsx
useEffect(() => { ... }, []);        // 마운트 시 1번만 실행
useEffect(() => { ... }, [count]);   // count가 바뀔 때마다 실행
useEffect(() => { ... });           // 매 렌더링마다 실행 (거의 안 씀)
```

> **주의:** 이 프로젝트에서 `useEffect` 안에서 `setState`를 연쇄 호출하지 않는다. 데이터 변환은 `useMemo`나 커스텀 훅에서 처리한다.

---

## 8. useMemo / useCallback — 불필요한 재계산 방지

### useMemo — 계산 결과를 기억

```tsx
// src/features/stock/hooks/useStockViewModel.ts
export const useStockViewModel = (sym, price, currencyMode, usdkrw) => {
  return useMemo(() => {
    // 이 계산은 sym, price, currencyMode, usdkrw가 바뀔 때만 재실행
    const display = price ? calcDisplayPrice(price, currencyMode, usdkrw) : null;
    return {
      displayName: price ? getDisplayName(price, sym) : sym.name,
      priceLabel: display ? `${display.prefix}${fmtNum(display.price, display.currency)}` : '',
      direction: price?.changeDirection || 'flat',
      // ... 더 많은 파생값
    };
  }, [sym, price, currencyMode, usdkrw]);
  //   ↑ 이 값들이 안 바뀌면 이전 결과를 재사용
};
```

**왜 필요한가?** 30개 종목의 가격을 표시한다면, 티커 속도 같은 무관한 설정이 바뀔 때 30개 종목의 표시값을 전부 재계산할 필요가 없다. `useMemo`는 관련 데이터가 실제로 바뀔 때만 재계산한다.

### useCallback — 함수 자체를 기억

```tsx
// src/app/App.tsx
const toggleTheme = useCallback(() => {
  const next = settings.theme === 'dark' ? 'light' : 'dark';
  updateSettings({ theme: next });
}, [settings.theme, updateSettings]);
```

**왜 필요한가?** JavaScript에서 함수를 만들 때마다 새 객체가 생성된다. `useCallback` 없이 `const fn = () => {...}`를 매 렌더에 새로 만들면, 이 함수를 props로 받는 자식 컴포넌트가 "props가 바뀌었다"고 판단해서 불필요하게 다시 그려진다.

```tsx
// 의존성이 바뀌지 않는 한 같은 함수 참조를 유지
const openSearch = useCallback(() => setSheet('search'), [setSheet]);
const openSettings = useCallback(() => setSheet('settings'), [setSheet]);
const handleRefresh = useCallback(() => refresh(), [refresh]);
```

> **팁:** `useMemo`는 **값**을, `useCallback`은 **함수**를 기억한다고 이해하면 된다. `useCallback(fn, deps)`는 `useMemo(() => fn, deps)`와 동일하다.

---

## 9. useRef — 렌더링 없이 값 저장

`useRef`는 값을 저장하되, 값이 바뀌어도 **컴포넌트를 다시 그리지 않는다**.

```tsx
// src/features/stock/hooks/useStockPrices.ts
const progressRef = useRef(0);

const setProgress = useCallback((v: number) => {
  progressRef.current = v;    // 값 변경 — 리렌더링 없음!
  listenersRef.current.forEach(fn => fn());  // 구독자에게만 알림
}, []);
```

**useState vs useRef:**

| | useState | useRef |
|--|----------|--------|
| 값 변경 시 | 리렌더링 발생 | 리렌더링 없음 |
| 용도 | 화면에 보여줄 데이터 | 내부 추적용 값, DOM 참조 |
| 접근 방식 | `value` 직접 사용 | `ref.current`로 접근 |

**실제 사용 예: 가격 변동 감지**

```tsx
// src/features/stock/hooks/usePriceFlash.ts
export const usePriceFlash = (price, direction, duration = 600) => {
  const prevRef = useRef(price);          // 이전 가격 기억 (렌더링 무관)
  const initialized = useRef(false);      // 첫 로드 여부 추적
  const [flash, setFlash] = useState(null); // 플래시 상태는 화면에 영향 → useState

  useEffect(() => {
    if (!initialized.current) {           // 최초 로드 시에는 플래시 안 함
      if (price) initialized.current = true;
      prevRef.current = price;
      return;
    }
    if (price && price !== prevRef.current) {  // 객체 참조가 달라졌다 = 새 데이터
      prevRef.current = price;
      setFlash(direction === 'flat' ? 'up' : direction);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(null), duration);
    }
  }, [price, direction, duration]);

  return flash;  // 'up' | 'down' | null → CSS 애니메이션 트리거
};
```

여기서 `prevRef`는 "이전 가격"을 기억하는 용도다. 이 값이 바뀐다고 화면을 다시 그릴 필요는 없으니 `useRef`를 쓴다. 반면 `flash`는 실제 화면의 애니메이션을 제어하므로 `useState`를 쓴다.

---

## 10. 커스텀 훅 — 로직을 재사용 가능한 함수로 추출

**커스텀 훅**은 `use`로 시작하는 함수로, 내부에서 React 훅을 사용할 수 있다. 여러 컴포넌트에서 반복되는 로직을 한 곳에 모은다.

### 10-1. useStockViewModel — 데이터 가공 전담

**문제:** 종목을 표시하는 곳이 3군데(리스트, 그리드, 타일)인데, 각각에서 "가격 포맷팅", "등락 화살표", "통화 변환" 등을 중복 계산하고 있었다.

**해결:** ViewModel 훅으로 **한 곳에서 모든 표시용 값을 계산**.

```tsx
// src/features/stock/hooks/useStockViewModel.ts
export const useStockViewModel = (
  sym: StockSymbol,
  price: StockPrice | undefined,
  currencyMode: 'KRW' | 'USD',
  usdkrw: number,
): StockViewModel => {
  return useMemo(() => {
    const dir = price?.changeDirection || 'flat';
    const display = price ? calcDisplayPrice(price, currencyMode, usdkrw) : null;

    return {
      displayName: price ? getDisplayName(price, sym) : sym.name,
      priceLabel: display
        ? `${display.prefix}${fmtNum(display.price, display.currency)}`
        : '',
      changeLabel: display
        ? `${dirArrow(dir)} ${fmtNum(display.change, display.currency)} (${fmtPercent(dir, price!.changePercent)})`
        : '',
      direction: dir,
      isLive: price?.marketStatus === 'OPEN',
      statusLabel: price?.isTradingHalt ? '거래정지'
        : price?.marketStatus === 'OPEN' ? 'LIVE' : 'CLOSE',
      hasPrice: !!price,
      // ... 더 많은 필드
    };
  }, [sym, price, currencyMode, usdkrw]);
};
```

**사용하는 쪽은 매우 단순해진다:**

```tsx
// StockRow 컴포넌트
const vm = useStockViewModel(sym, price, currencyMode, usdkrw);
return (
  <div>
    <span>{vm.displayName}</span>
    <span>{vm.priceLabel}</span>
    <span>{vm.changeLabel}</span>
    {vm.isLive && <span>LIVE</span>}
  </div>
);
```

컴포넌트는 "어떻게 표시할지"만 담당하고, "데이터를 어떻게 가공할지"는 훅이 담당한다.

### 10-2. useOutsideClick — DOM 이벤트 로직 재사용

```tsx
// src/shared/hooks/useOutsideClick.ts
export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      // ref가 가리키는 요소 바깥을 클릭했는지 확인
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, active, onOutside]);
};
```

**사용:**

```tsx
// 드롭다운 외부 클릭 시 닫기
const menuRef = useRef(null);
useOutsideClick(menuRef, isMenuOpen, () => setMenuOpen(false));
return <div ref={menuRef}>메뉴 내용</div>;
```

### 10-3. useBackAction — 레이어드 뒤로가기

여러 레이어(Sheet 위에 Modal, Modal 위에 WebView)가 동시에 열려 있을 때, ESC 키를 누르면 **가장 위의 레이어만** 닫아야 한다.

```tsx
// src/shared/hooks/useBackAction.ts
const backStack: BackHandler[] = [];    // 전역 스택

// ESC → 스택 맨 위만 실행
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  const top = backStack[backStack.length - 1];
  if (top) top();
};

export const useBackAction = (active: boolean, onBack: () => void) => {
  useEffect(() => {
    if (!active) return;
    backStack.push(onBack);      // 활성화되면 스택에 추가
    return () => {               // 비활성화되면 스택에서 제거
      const idx = backStack.lastIndexOf(onBack);
      if (idx !== -1) backStack.splice(idx, 1);
    };
  }, [active, onBack]);
};
```

**사용:**

```tsx
// Sheet가 열려있을 때 ESC → Sheet 닫기
useBackAction(sheetOpen, () => setSheetOpen(false));

// Modal이 열려있을 때 ESC → Modal 닫기 (Sheet보다 나중에 등록 → 먼저 실행)
useBackAction(modalOpen, () => setModalOpen(false));
```

스택 구조 덕분에 `Modal`이 먼저 닫히고, 다시 ESC를 누르면 그때서야 `Sheet`가 닫힌다.

### 10-4. useStockGroups — 데이터 분류 로직 분리

```tsx
// src/features/stock/hooks/useStockGroups.ts
export const useStockGroups = (
  symbols: StockSymbol[],
  prices: Record<string, StockPrice>,
  customGroups?: StockGroup[],
  options?: { sortByMarketOpen?: boolean },
) => {
  return useMemo(() => {
    // "전체" 탭: 프리셋 이름 기준 그룹
    if (customGroups) {
      return { validSymbols: ..., groups: customGroups };
    }
    // 개별 탭: 국내주식 / 해외주식 / 지수·선물 자동 분류
    const domestic = stocks.filter(sym => sym.nation === 'KR');
    const overseas = stocks.filter(sym => sym.nation !== 'KR');
    const indexFutures = valid.filter(sym => inferCategory(sym) !== 'stock');

    // 개장 중인 시장을 위로 정렬 (옵션)
    if (options?.sortByMarketOpen) { ... }

    return { validSymbols: valid, groups };
  }, [symbols, prices, customGroups, options?.sortByMarketOpen]);
};
```

이 훅이 없었다면 StockList, StockGrid, StockTile 3곳에 동일한 분류 로직이 복제되어 있었을 것이다. 분류 규칙이 바뀌면 3곳을 동시에 수정해야 하는 위험이 있었다.

---

## 11. Context API — 전역 데이터 공유

**Context**는 컴포넌트 트리를 관통해서 데이터를 전달하는 방법이다. Props를 여러 단계에 걸쳐 내려보내는 "prop drilling" 문제를 해결한다.

### 패턴: Provider + useContext 훅

이 프로젝트의 Toast 시스템과 Confirm 다이얼로그가 이 패턴을 사용한다.

**1단계: Context 생성 + Provider 컴포넌트**

```tsx
// src/shared/ui/Toast.tsx

// (1) Context 만들기 — "어떤 형태의 데이터를 공유할지" 정의
const ToastContext = createContext<ToastContextType>({ show: () => {} });

// (2) 꺼내 쓸 수 있는 훅
export const useToast = () => useContext(ToastContext);

// (3) Provider — 데이터를 실제로 제공하는 컴포넌트
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts([{ id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Portal로 body에 직접 렌더링 */}
      {ReactDOM.createPortal(
        <div>{toasts.map(t => <div key={t.id}>{t.message}</div>)}</div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
```

**2단계: 앱 최상위에 Provider 배치**

```tsx
// src/app/App.tsx
export const App = () => (
  <ToastProvider>          {/* Toast 사용 가능 범위 시작 */}
    <ConfirmProvider>      {/* Confirm 사용 가능 범위 시작 */}
      <AppContent />
    </ConfirmProvider>
  </ToastProvider>
);
```

**3단계: 어디서든 사용**

```tsx
// 아무 컴포넌트에서든 — props 전달 없이!
const toast = useToast();
toast.show('복사 완료!', 'copy');
```

### Confirm 다이얼로그의 Promise 패턴

특히 주목할 점은 **Confirm 다이얼로그가 Promise를 반환**한다는 것이다:

```tsx
// src/shared/ui/ConfirmDialog.tsx
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => {
    // Promise를 만들고, resolve를 state에 저장
    return new Promise(resolve => setState({ opts, resolve }));
  }, []);

  const handle = (result: boolean) => {
    state?.resolve(result);  // Promise를 해결 (true/false)
    setState(null);          // 다이얼로그 닫기
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && <ConfirmModal opts={state.opts} onResult={handle} />}
    </ConfirmContext.Provider>
  );
};
```

**사용하는 쪽에서 `await`로 결과를 받을 수 있다:**

```tsx
// App.tsx — 닫기 버튼 핸들러
const confirm = useConfirm();

const handleClose = useCallback(async () => {
  if (!localStorage.getItem(TRAY_HIDE_NOTICE_KEY)) {
    const ok = await confirm({         // 다이얼로그가 뜨고...
      title: '트레이로 숨어요',
      message: '앱을 완전히 종료하려면\n트레이 아이콘 "우클릭 → 종료"를 클릭하세요.',
      confirmText: '확인',
      hideCancel: true,
    });
    if (!ok) return;                    // 사용자가 취소하면 여기서 중단
    localStorage.setItem(TRAY_HIDE_NOTICE_KEY, '1');
  }
  window.electronAPI?.close();          // 확인을 누르면 창 닫기
}, [confirm]);
```

비동기 UI 흐름(`다이얼로그 띄우기 → 사용자 응답 기다리기 → 결과에 따라 분기`)을 `async/await`로 자연스럽게 표현할 수 있다.

---

## 12. Zustand — 전역 상태 관리

**Zustand**는 React의 전역 상태 관리 라이브러리다. Redux보다 훨씬 간단하다.

### 12-1. Store 만들기

```tsx
// src/app/store/index.ts
import { create } from 'zustand';

export const useStore = create<AppState>((set, get) => ({
  // ── 초기 상태 ──
  settings: loadSettings(),
  presets: loadPresets(),
  activeId: localStorage.getItem(ACTIVE_KEY) || 'default',
  openSheet: null,
  detailSymbol: null,

  // ── 상태를 바꾸는 함수들 ──
  updateSettings: (patch) => set(state => {
    const next = { ...state.settings, ...patch };  // 기존 설정 + 변경분 병합
    saveSettings(next);                             // localStorage에도 저장
    return { settings: next };                      // 새 상태 반환
  }),

  setSheet: (name) => set({ openSheet: name }),

  addPreset: (name) => {
    const id = `preset-${Date.now()}`;
    const next = [...get().presets, { id, name, symbols: [] }];
    //             ↑ get()으로 현재 상태 읽기
    savePresets(next);
    set({ presets: next, activeId: id });
  },
}));
```

**핵심 문법:**
- `create()` — store 생성. 안에 상태 + 액션을 함께 정의
- `set()` — 상태를 업데이트. 전달한 객체로 기존 상태를 병합
- `get()` — 현재 상태를 읽기 (액션 내부에서 사용)

### 12-2. 컴포넌트에서 사용하기

```tsx
// 방법 1: selector 함수로 필요한 것만 꺼내기 (권장)
const settings = useStore(s => s.settings);
const updateSettings = useStore(s => s.updateSettings);

// 방법 2: 여러 값을 각각 꺼내기
const theme = useStore(s => s.settings.theme);
const opacity = useStore(s => s.settings.opacity);
```

**Selector가 중요한 이유:**

```tsx
// 나쁜 예: 전체 store를 구독
const store = useStore();
// → settings, presets, openSheet 등 무엇이 바뀌든 리렌더링

// 좋은 예: 필요한 값만 선택
const theme = useStore(s => s.settings.theme);
// → theme이 바뀔 때만 리렌더링. presets가 바뀌어도 영향 없음
```

### 12-3. 파생 셀렉터 (Derived Selectors)

자주 사용하는 파생 값은 별도 훅으로 만든다:

```tsx
// src/app/store/selectors.ts

/** 현재 테마 객체 */
export const useTheme = () => {
  const isDark = useStore(s => s.settings.theme === 'dark');
  return isDark ? darkTheme : lightTheme;
};

/** 현재 표시할 심볼 리스트 */
export const useDisplaySymbols = () => {
  const isAll = useIsAllView();
  const allSymbols = useAllSymbols();
  const activePreset = useActivePreset();
  return isAll ? allSymbols : activePreset.symbols;
};

/** 전체 그룹 통틀어 유니크 종목 수 */
export const useTotalUniqueSymbolCount = () => {
  const presets = useStore(s => s.presets);
  return useMemo(
    () => new Set(presets.flatMap(p => p.symbols.map(s => s.code))).size,
    [presets],
  );
};
```

### 12-4. 불변성 (Immutability) 패턴

Zustand는 상태를 **불변(immutable)**하게 업데이트해야 한다. 기존 객체를 직접 수정하지 않고, 새 객체를 만든다.

```tsx
// 나쁜 예: 원본을 직접 수정
state.presets.push(newPreset);  // ✗ 원본 배열 변경

// 좋은 예: 새 배열/객체 생성
const next = [...get().presets, newPreset];   // ✓ 스프레드로 복사 후 추가
set({ presets: next });

// 배열에서 제거
const next = presets.filter(p => p.id !== id);       // ✓ 새 배열 반환

// 객체 속성 병합
const next = { ...state.settings, ...patch };         // ✓ 새 객체 반환

// 배열 내 특정 항목 수정
const next = presets.map(p => p.id === id ? { ...p, name } : p);  // ✓ 해당 항목만 새 객체
```

**왜 불변성이 중요한가?** React는 "이전 값과 현재 값이 같은 객체인지"를 비교해서 리렌더링 여부를 결정한다. 원본을 직접 수정하면 참조가 같아서 React가 변경을 감지하지 못한다.

---

## 13. React Query — 서버 데이터 자동 관리

**React Query(TanStack Query)**는 서버에서 가져온 데이터의 캐싱, 자동 갱신, 에러 처리를 담당한다.

### 13-1. 기본 개념

```tsx
// src/app/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,                     // 실패 시 2번 재시도
      staleTime: 10_000,            // 10초간 "신선"하다고 간주
      refetchOnWindowFocus: false,  // 창 포커스 시 자동 갱신 안 함
      networkMode: 'online',        // 오프라인이면 요청 보류
    },
  },
});
```

### 13-2. useQuery 사용하기

```tsx
// src/features/stock/hooks/useStockPrices.ts
const { data: prices = {}, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
  queryKey: ['stockPrices', symbols.map(s => s.code).sort()],
  //         ↑ 캐시 키: 이 키가 같으면 캐시된 데이터 반환
  queryFn: () => fetchInBatches(symbols, setProgress),
  //        ↑ 데이터를 가져오는 함수
  refetchInterval: () => refreshInterval * 1000 + (Math.random() * 10_000 - 5_000),
  //               ↑ 자동 갱신 간격 (±5초 지터 추가)
  enabled: symbols.length > 0,
  //       ↑ 종목이 없으면 요청 안 함
  retry: false,
  structuralSharing: false,
  //                 ↑ 매번 새 객체 → usePriceFlash가 변경 감지 가능
});
```

**반환값 설명:**
- `data` — 서버에서 가져온 데이터 (여기서는 `prices`)
- `isLoading` — 첫 번째 로딩 중 (캐시 없음)
- `isFetching` — 백그라운드에서 갱신 중 (캐시 있지만 새 데이터 가져오는 중)
- `dataUpdatedAt` — 마지막 갱신 시각
- `refetch` — 수동 갱신 함수

### 13-3. 오프라인 처리

```tsx
// src/app/providers/QueryProvider.tsx

// 네트워크 상태 감지 등록
onlineManager.setEventListener(setOnline => {
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
  // ...
});

// 온라인 복귀 시 모든 stale 쿼리 무효화 → 자동 재요청
useEffect(() => {
  const handleOnline = () => queryClient.invalidateQueries();
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, []);
```

오프라인이 되면 모든 쿼리가 자동으로 일시정지(pause)되고, 다시 온라인이 되면 자동으로 최신 데이터를 가져온다.

---

## 14. Emotion — JavaScript로 CSS 작성

**Emotion**은 CSS-in-JS 라이브러리다. JavaScript 파일 안에서 CSS를 작성한다.

### 14-1. 기본 문법

```tsx
/** @jsxImportSource @emotion/react */
//  ↑ 이 주석이 있어야 css prop이 동작

import { css } from '@emotion/react';

const App = () => (
  <div css={css`
    height: 100vh;
    display: flex;
    background: ${sem.bg.base};
  `}>
    내용
  </div>
);
```

### 14-2. 스타일 객체 패턴

이 프로젝트에서는 **스타일을 컴포넌트 하단에 `s` 객체로 모아둔다**:

```tsx
// App.tsx 하단
const s = {
  app: css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: ${sem.bg.base};
    border-radius: 12px;
    overflow: hidden;
  `,
};

// 사용
<div css={s.app}>내용</div>
```

### 14-3. 동적 스타일 (함수로 만들기)

```tsx
// ConfirmDialog.tsx
const s = {
  // danger 여부에 따라 다른 색상 적용
  confirmBtn: (danger?: boolean) => css`
    background: ${danger ? sem.action.danger : sem.action.primary};
    color: ${sem.text.inverse};
    border-radius: ${radius.xl}px;
  `,
};

// 사용
<button css={s.confirmBtn(opts.danger)}>확인</button>
```

### 14-4. Keyframe 애니메이션

```tsx
// Toast.tsx
import { keyframes } from '@emotion/react';

const slideDown = keyframes`
  0%   { opacity: 0; transform: translateY(-12px); }
  8%   { opacity: 1; transform: translateY(0); }
  85%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
`;

const s = {
  toast: css`
    animation: ${slideDown} 2.4s ease forwards;
  `,
};
```

### 14-5. Global 스타일과 Portal

```tsx
// 전역 스타일 (body, reset 등)
import { Global } from '@emotion/react';
<Global styles={globalStyles(theme, isDark)} />

// Portal — React 트리 밖의 DOM에 직접 렌더링
import ReactDOM from 'react-dom';
{ReactDOM.createPortal(
  <div css={s.toastContainer}>...</div>,
  document.body    // body 바로 아래에 렌더링
)}
```

Portal은 모달, 토스트, 툴팁처럼 **DOM 구조상 최상위에 있어야 하는 요소**에 사용한다. React 컴포넌트 트리에서는 `<ToastProvider>` 안에 있지만, 실제 DOM에서는 `<body>` 바로 아래에 렌더링된다.

---

## 15. 디자인 토큰과 테마 시스템

이 프로젝트는 **3단계 계층**으로 색상을 관리한다:

```
theme.ts (실제 색상값)
    ↓
vars.ts (CSS 변수 이름)
    ↓
semantic.ts (의미 기반 이름)
    ↓
컴포넌트 (sem.* 만 사용)
```

### 15-1. theme.ts — 실제 색상값 정의

```tsx
// src/shared/styles/theme.ts
const darkColors = {
  bg: '#131417',
  text: '#F2F4F6',
  accent: '#4593FC',
  up: '#F04452',      // 상승 = 빨강
  down: '#3182F6',    // 하락 = 파랑
  // ...
};

const lightColors = {
  bg: '#FFFFFF',
  text: '#191F28',
  accent: '#3182F6',
  up: '#E42939',
  down: '#2272EB',
  // ...
};
```

### 15-2. vars.ts — CSS 변수로 변환

```tsx
// src/shared/styles/vars.ts
export const v = {
  bg: 'var(--c-bg)',           // CSS 변수 이름
  text: 'var(--c-text)',
  accent: 'var(--c-accent)',
  up: 'var(--c-up)',
  down: 'var(--c-down)',
};

// theme 객체 → CSS 변수 문자열로 변환하는 함수
export const themeToVars = (colors) => `
  --c-bg: ${colors.bg};
  --c-text: ${colors.text};
  --c-accent: ${colors.accent};
`;
```

### 15-3. semantic.ts — 의미 기반 이름

```tsx
// src/shared/styles/semantic.ts
import { v } from './vars';

export const sem = {
  text: {
    primary:   v.text,           // 주요 텍스트
    secondary: v.textSecondary,  // 보조 텍스트
    disabled:  v.textDisabled,   // 비활성 텍스트
  },
  bg: {
    base:     v.bg,              // 기본 배경
    surface:  v.bgSecondary,     // 카드 배경
    elevated: v.bgTertiary,      // 떠있는 배경
  },
  feedback: {
    up:   v.up,                  // 상승
    down: v.down,                // 하락
    flat: v.flat,                // 보합
  },
  action: {
    primary: v.accent,           // 주요 액션 색상
    danger:  v.danger,           // 위험 액션
  },
};
```

### 15-4. 컴포넌트에서 사용

```tsx
// 컴포넌트는 오직 sem.* 만 사용 — vars.ts, theme.ts 직접 import 금지
const s = {
  container: css`
    background: ${sem.bg.base};
    color: ${sem.text.primary};
    border: 1px solid ${sem.border.default};
  `,
  price: (dir: 'up' | 'down' | 'flat') => css`
    color: ${sem.feedback[dir]};
  `,
};
```

### 15-5. 디자인 토큰 (색상 외 값)

```tsx
// src/shared/styles/tokens.ts
export const spacing = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20 };
export const fontSize = { xs: 10, sm: 11, md: 12, base: 13, lg: 14 };
export const radius = { xs: 3, sm: 4, md: 6, lg: 8, xl: 10, '2xl': 12 };
export const transition = { fast: '0.15s ease', normal: '0.2s ease' };
export const zIndex = { base: 1, dropdown: 100, overlay: 500, modal: 600, toast: 700 };

// 유틸: 여러 spacing을 합산
export const sp = (...keys) =>
  keys.reduce((acc, k) => acc + spacing[k], 0) + 'px';
// sp('md', 'xs') = 8 + 2 = '10px'
```

**사용:**

```tsx
const s = {
  toast: css`
    padding: ${sp('md', 'xs')} 18px;
    border-radius: ${radius['2xl']}px;
    font-size: ${fontSize.base}px;
    font-weight: ${fontWeight.semibold};
  `,
};
```

**왜 이렇게 하나?**
- `padding: 10px` 대신 `padding: ${sp('md', 'xs')}` → 값을 tokens.ts에서 한 번만 바꾸면 앱 전체에 반영
- `color: #F04452` 대신 `color: ${sem.feedback.up}` → 다크/라이트 테마 자동 대응
- 하드코딩된 색상 / 숫자가 코드에 흩어지지 않음

### 15-6. 테마 전환 동작 원리

```tsx
// App.tsx
<Global styles={globalStyles(theme, isDark)} />
// → :root에 CSS 변수를 주입: --c-bg: #131417; --c-text: #F2F4F6; ...

// 테마 전환 버튼
const toggleTheme = useCallback(() => {
  updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
}, [settings.theme, updateSettings]);
```

테마가 바뀌면:
1. `settings.theme`이 `'light'`에서 `'dark'`로 변경
2. `globalStyles`가 `:root`의 CSS 변수를 재설정
3. `var(--c-bg)`를 사용하는 모든 요소가 **자동으로** 새 색상 반영
4. 컴포넌트 리렌더링 없이 순수 CSS 레벨에서 색상이 전환됨

---

## 16. TypeScript — 타입으로 코드 안전망 만들기

### 16-0. TypeScript가 뭔데?

TypeScript는 **JavaScript에 "타입"을 추가한 언어**다. 파일 확장자가 `.ts` (또는 React용 `.tsx`)이다.

**JavaScript의 문제:**

```javascript
// JavaScript — 아무 에러 없이 실행됨
function getPrice(code) {
  return code * 2;  // code가 문자열인데 곱하기? → NaN (버그)
}
getPrice("삼성전자");  // NaN — 실행해야 버그를 발견
```

**TypeScript의 해결:**

```typescript
// TypeScript — 코드를 실행하기 전에 에러 표시
function getPrice(code: string) {
  return code * 2;  // ✗ 빨간 밑줄! "string에 * 연산을 할 수 없습니다"
}
```

즉, **코드를 실행하지 않고도 버그를 잡아준다**. 이것이 TypeScript의 전부다.

> TypeScript 코드는 실행 전에 JavaScript로 변환(컴파일)된다. 브라우저는 여전히 JavaScript만 실행한다. 타입 정보는 개발 중에만 사용되고, 실행 파일에는 포함되지 않는다.

### 16-1. 기본 타입 — 변수에 "이것만 담을 수 있다"고 선언

```typescript
// ── 기본 타입 ──

let name: string = '삼성전자';        // 문자열
let price: number = 75000;           // 숫자 (정수/소수 구분 없음)
let isLive: boolean = true;          // true 또는 false
let updatedAt: Date = new Date();    // 날짜 객체

// ── 배열 ──

let codes: string[] = ['005930', 'AAPL.O'];     // 문자열 배열
let prices: number[] = [75000, 195.5];           // 숫자 배열

// ── "이거 아니면 저거" (유니온 타입) ──

let direction: 'up' | 'down' | 'flat' = 'up';
//             ↑ 이 세 문자열 중 하나만 가능. 'rise' 같은 건 에러

let result: string | null = null;
//          ↑ 문자열이거나 null
```

**이 프로젝트에서의 실제 사용:**

```tsx
// src/shared/types/index.ts
export interface AppSettings {
  theme: 'light' | 'dark';                         // 두 값 중 하나
  opacity: number;                                  // 0 ~ 1 사이의 숫자
  alwaysOnTop: boolean;                             // true/false
  refreshInterval: number;                          // 초 단위
  viewMode: 'list' | 'grid' | 'tile';              // 세 값 중 하나
  fontSize: 'small' | 'medium' | 'large' | 'xlarge'; // 네 값 중 하나
}
```

이렇게 타입을 정의해두면, `theme: 'blue'` 같은 잘못된 값을 넣으면 **코드를 실행하기도 전에** 빨간 밑줄이 뜬다.

### 16-2. 타입 추론 — 직접 안 써도 TypeScript가 알아냄

매번 타입을 쓸 필요는 없다. TypeScript는 값을 보고 **자동으로 타입을 추론**한다:

```typescript
// 타입을 명시하지 않아도...
const name = '삼성전자';     // TypeScript가 자동으로 string으로 추론
const price = 75000;         // number로 추론
const isOpen = true;         // boolean으로 추론

// 함수 반환값도 추론
const double = (n: number) => n * 2;
//      ↑ 반환 타입 number를 자동 추론 (: number 안 써도 됨)
```

**규칙: 추론이 명확하면 생략, 복잡하거나 공개 API면 명시.**

이 프로젝트에서 타입을 명시하는 곳과 생략하는 곳:

```tsx
// 명시: 함수 파라미터 (무엇이 들어올지 모르므로)
const calcDisplayPrice = (p: StockPrice, currencyMode: 'KRW' | 'USD', usdkrw: number) => {

// 명시: 함수 반환값 (API 경계이므로 명확히)
const fetchDomesticStocksBatch = async (codes: string[]): Promise<Record<string, StockPrice>> => {

// 생략: 지역 변수 (오른쪽 값에서 명확)
const change = parseFloat(d.compareToPreviousClosePriceRaw || '0');  // number인 게 뻔함
const isKR = p.currency === 'KRW';        // boolean인 게 뻔함
```

### 16-3. interface — 객체의 구조를 정의하는 설계도

**interface**는 "이 객체에는 어떤 필드가 있고, 각 필드의 타입은 뭔지" 정의하는 **설계도**다.

```typescript
// "종목" 데이터의 설계도
export interface StockSymbol {
  code: string;         // 필수. 반드시 문자열
  name: string;         // 필수
  market: string;       // 필수
  nation: string;       // 필수
  nameEn?: string;      // 선택 (? = 없어도 됨)
  reutersCode?: string; // 선택
  category?: 'stock' | 'index' | 'futures';  // 선택, 있으면 이 3개 중 하나
}
```

**`?` 기호의 의미:**

```typescript
interface Example {
  required: string;    // 반드시 있어야 함. 없으면 에러
  optional?: string;   // 있어도 되고 없어도 됨
}

// OK
const a: Example = { required: '필수' };
const b: Example = { required: '필수', optional: '선택' };

// 에러
const c: Example = { optional: '선택' };  // ✗ required가 없음!
```

**interface 안에 interface:**

```typescript
// 앱 설정 — 내부에 중첩 구조
export interface AppSettings {
  theme: 'light' | 'dark';
  opacity: number;
  resolution: { width: number; height: number };  // 인라인 객체 타입
  screenshot: ScreenshotSettings;                  // 다른 interface 참조
}

export interface ScreenshotSettings {
  shortcut: string;
  mode: 'clipboard' | 'file';
  savePath: string;
}
```

### 16-4. 함수에 타입 붙이기

```typescript
// ── 기본: 파라미터와 반환값에 타입 지정 ──

// 파라미터: number → 반환: string
const fmtNum = (n: number, currency: string): string =>
  currency === 'KRW'
    ? n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { minimumFractionDigits: 2 });

fmtNum(75000, 'KRW');    // OK → "75,000"
fmtNum('75000', 'KRW');  // ✗ 에러! string은 number가 아님


// ── 콜백 함수 타입 ──

// "() => void" = 파라미터 없고 반환값 없는 함수
type BackHandler = () => void;

// "(message: string, type?: ToastType) => void" = 메시지 필수, 타입 선택
interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
}


// ── 비동기 함수 (Promise) ──

// async 함수는 반환 타입이 Promise<T>
const fetchDomesticStocksBatch = async (codes: string[]): Promise<Record<string, StockPrice>> => {
  // ...
  return out;  // { '005930': StockPrice, '000660': StockPrice, ... }
};

// 호출하는 쪽에서 await로 받으면 Promise가 벗겨짐
const prices = await fetchDomesticStocksBatch(['005930', '000660']);
//    ↑ 타입: Record<string, StockPrice>
```

### 16-5. 유니온 타입 — "이거 아니면 저거"

유니온(`|`)은 **여러 타입 중 하나**를 의미한다. 이 프로젝트에서 가장 많이 쓰이는 패턴이다.

```typescript
// 문자열 리터럴 유니온 — 허용할 값을 정확히 지정
type Direction = 'up' | 'down' | 'flat';
type ViewMode = 'list' | 'grid' | 'tile';
type SheetName = 'search' | 'settings' | 'investor' | 'ranking' | 'news' | 'marquee' | 'newGroup';

// 타입 + null — "값이 없을 수도 있다"
let detailSymbol: StockSymbol | null = null;
let openSheet: SheetName | null = null;
```

**TypeScript는 유니온 타입을 사용하면 가능한 경우를 모두 처리하도록 강제한다:**

```typescript
const dirArrow = (d: Direction): string =>
  d === 'up' ? '▲' : d === 'down' ? '▼' : '';
//  ↑ 'up', 'down', 'flat' 세 경우를 모두 처리

// 만약 Direction에 'limit'을 추가하면?
// → 'limit'에 대한 처리가 없으므로 TypeScript가 경고를 표시할 수 있음
```

### 16-6. as const — "이 값은 절대 안 바뀐다"

```typescript
// as const 없으면
const spacing = { xs: 2, sm: 4, md: 8 };
// 타입: { xs: number, sm: number, md: number }
// → spacing.xs = 999; 도 OK (number니까)

// as const 있으면
export const spacing = { xs: 2, sm: 4, md: 8 } as const;
// 타입: { readonly xs: 2, readonly sm: 4, readonly md: 8 }
// → spacing.xs = 999;  ✗ 에러! readonly라서 변경 불가
// → spacing.xs의 타입이 number가 아닌 정확히 "2"
```

이 프로젝트의 디자인 토큰이 전부 `as const`를 사용한다:

```typescript
// src/shared/styles/tokens.ts
export const spacing = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 } as const;
export const fontSize = { xs: 10, sm: 11, md: 12, base: 13 } as const;
export const radius = { xs: 3, sm: 4, md: 6, lg: 8 } as const;
```

이렇게 하면 누군가 실수로 `spacing.md = 100`으로 바꾸는 것을 **컴파일 타임에 방지**한다.

### 16-7. Generic — "타입을 나중에 결정할게"

Generic은 **함수를 만들 때는 타입을 정하지 않고, 사용할 때 결정**하는 문법이다.

비유하자면 **"빈칸이 있는 틀"**이다:

```typescript
// T는 아직 모르는 타입 (빈칸)
const fetchJSON = async <T>(url: string): Promise<T> => {
  const result = await window.electronAPI.naverFetch(url);
  return result.data as T;  // "result.data를 T 타입으로 취급해줘"
};
```

사용할 때 `<구체적 타입>`으로 **빈칸을 채운다:**

```typescript
// T = NaverPollingResponse → 국내주식 polling 응답 타입
const domestic = await fetchJSON<NaverPollingResponse>(
  `${BASE}/polling/domestic/stock?itemCodes=005930,000660`
);
// domestic.datas, domestic.datas[0].closePriceRaw 등에 자동완성이 뜬다

// T = NaverPollingResponse → 해외주식 polling 응답 타입 (도메인이 다름!)
const overseas = await fetchJSON<NaverPollingResponse>(
  `https://polling.finance.naver.com/api/realtime/worldstock/stock/NVDA.O,AAPL.O`
);
// overseas.datas[0].closePriceRaw, overseas.datas[0].reutersCode 등에 자동완성이 뜬다
```

**Generic 없이 했다면?**

```typescript
// 방법 1: any — 타입 검사 포기 (위험)
const fetchJSON = async (url: string): Promise<any> => { ... };
const data = await fetchJSON(url);
data.아무거나;  // 에러 안 남 — 오타도 못 잡음

// 방법 2: 함수를 API마다 하나씩 만듦 (중복)
const fetchStockJSON = async (url: string): Promise<NaverPollingResponse> => { ... };
const fetchIndexJSON = async (url: string): Promise<NaverPollingResponse> => { ... };
// → fetch 로직은 동일한데 타입만 다르다고 함수를 여러 개 만드는 건 낭비
```

Generic은 **로직은 같은데 타입만 다른 경우**에 사용한다.

### 16-8. React에서 자주 보이는 타입 패턴

```typescript
// ── useState에 타입 지정 ──

const [toasts, setToasts] = useState<ToastItem[]>([]);
//                                  ↑ "ToastItem 배열"이라고 알려줌
// 안 쓰면 → useState([]) → 타입이 never[]로 추론되어 아무것도 못 넣음

const [state, setState] = useState<ConfirmState | null>(null);
//                                ↑ ConfirmState이거나 null


// ── 이벤트 핸들러 타입 ──

const handler = (e: MouseEvent) => { ... };      // 마우스 이벤트
const onKey = (e: KeyboardEvent) => { ... };      // 키보드 이벤트
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }; // input 변경


// ── children 타입 (자식 컴포넌트를 감쌀 때) ──

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;  // JSX, 문자열, 숫자, 배열, null 등 뭐든 가능
}
const ToastProvider = ({ children }: Props) => {
  return <div>{children}</div>;
};


// ── ref 타입 ──

const modalRef = useRef<HTMLDivElement>(null);
//                     ↑ "이 ref는 div 요소를 가리킬 것이다"
const timer = useRef<ReturnType<typeof setTimeout>>();
//                   ↑ "setTimeout의 반환값 타입"
```

### 16-9. 타입 단언 (as) — "내가 타입을 알아"

TypeScript가 타입을 정확히 추론하지 못할 때, 개발자가 **"이건 이 타입이야"라고 알려주는** 문법이다:

```typescript
// 예 1: API 응답의 data는 unknown이지만, 우리는 구조를 알고 있음
const result = await window.electronAPI.naverFetch(url);
return result.data as T;
//                  ↑ "result.data를 T 타입으로 취급해줘"

// 예 2: DOM 이벤트의 target
const handler = (e: MouseEvent) => {
  if (ref.current && !ref.current.contains(e.target as Node)) {
    //                                     ↑ e.target은 EventTarget이지만
    //                                       contains()는 Node를 받으므로 단언
    onOutside();
  }
};

// 예 3: JSON.parse 결과 (항상 unknown)
const stored = localStorage.getItem('settings');
const parsed = JSON.parse(stored!) as AppSettings;
//                               ↑ !는 "null이 아니라고 보장" (non-null assertion)
//                                        ↑ 파싱 결과를 AppSettings로 취급
```

> **주의:** `as`는 TypeScript의 검사를 우회하는 것이므로, 정말 타입이 확실할 때만 사용해야 한다. 남용하면 타입 시스템의 의미가 없어진다.

### 16-10. `?.` 와 `!` — 안전한 접근 vs 강제 접근

```typescript
// ── ?. (옵셔널 체이닝) — "있으면 접근, 없으면 undefined" ──

window.electronAPI?.close();
// electronAPI가 undefined면 → close()를 호출하지 않고 undefined 반환
// electronAPI가 있으면 → close() 정상 호출

const name = price?.name || '알 수 없음';
// price가 null/undefined면 → '알 수 없음'
// price가 있으면 → price.name 사용

// 이 프로젝트에서 ?.를 쓰는 이유:
// Electron 앱이 아닌 일반 브라우저에서도 에러 없이 동작하도록 (개발 모드)


// ── ! (non-null assertion) — "이건 절대 null이 아니야" ──

document.getElementById('root')!
//                               ↑ "null일 수 없으니 검사 스킵해"
// index.html에 <div id="root">가 반드시 있으므로 안전

// 하지만 남용하면 위험:
const value = maybeNull!.property;  // maybeNull이 실제로 null이면 런타임 에러!
```

### 16-11. Record와 맵 타입 — 키-값 구조

```typescript
// Record<키타입, 값타입> — 사전(dictionary) 같은 객체
const prices: Record<string, StockPrice> = {};
// ↑ 키는 문자열(종목코드), 값은 StockPrice

// 실제 사용:
prices['005930'] = { code: '005930', currentPrice: 75000, ... };
prices['AAPL.O'] = { code: 'AAPL', currentPrice: 195.5, ... };

// 값 꺼낼 때
const samsung = prices['005930'];  // 타입: StockPrice (undefined일 수도 있음)


// ── 이 프로젝트의 실제 Record 사용 예 ──

// 국가 코드 매핑
const nationMap: Record<string, string> = {
  USA: 'US', JPN: 'JP', CHN: 'CN', HKG: 'HK', VNM: 'VN'
};

// 토스트 아이콘 설정
const ICON: Record<ToastType, { icon: ReactNode; color: string; glow: string }> = {
  success: { icon: <FiCheck />, color: sem.action.success, glow: ... },
  error:   { icon: <FiAlertCircle />, color: sem.action.danger, glow: ... },
  // ...
};
```

### 16-12. 유틸리티 타입 — 기존 타입을 변형

TypeScript가 기본 제공하는 "타입을 변형하는 도구":

```typescript
// ── Partial<T> — 모든 필드를 선택적으로 ──

// AppSettings에는 필수 필드가 10개 이상이지만...
updateSettings: (patch: Partial<AppSettings>) => void;
// Partial<AppSettings>은 모든 필드가 ?가 됨
// → { theme: 'dark' } 만 전달해도 OK

// Partial 없이 했다면:
updateSettings({ theme: 'dark', opacity: 0.95, alwaysOnTop: false, ... });
// → 바꾸고 싶은 건 theme 하나인데, 나머지 모든 필드를 다시 써야 함


// ── Pick<T, Keys> — 특정 필드만 골라내기 ──

type SymbolRef = Pick<StockSymbol, 'code' | 'nation' | 'reutersCode'>;
// = { code: string; nation: string; reutersCode?: string }
// StockSymbol의 필드 중 3개만 가진 축소 버전

// 이 프로젝트의 실제 사용:
const getNaverStockUrl = (symbol: Pick<StockSymbol, 'code' | 'nation' | 'reutersCode'>) => {
  // StockSymbol 전체가 아니어도, code/nation/reutersCode만 있으면 됨
};


// ── Omit<T, Keys> — 특정 필드만 제외 ──

type PresetMeta = Omit<Preset, 'symbols'>;
// = { id: string; name: string }
// Preset에서 symbols만 제거한 버전


// ── ReturnType<T> — 함수의 반환 타입 추출 ──

const timer = useRef<ReturnType<typeof setTimeout>>();
// setTimeout이 반환하는 타입을 자동으로 추출 (NodeJS.Timeout)
```

### 16-13. typeof와 keyof — 이미 있는 것에서 타입 추출

```typescript
// ── typeof — 값에서 타입을 추출 ──

export const spacing = { xs: 2, sm: 4, md: 8, lg: 12 } as const;

type SpaceKey = keyof typeof spacing;
//              ↑ typeof spacing = { readonly xs: 2, readonly sm: 4, ... }
//     keyof ↑ = 'xs' | 'sm' | 'md' | 'lg'

// → SpaceKey 타입은 'xs' | 'sm' | 'md' | 'lg'

// 이 프로젝트의 sp() 유틸에서 사용:
export const sp = (...keys: SpaceKey[]): string =>
  keys.reduce((acc, k) => acc + spacing[k], 0) + 'px';

sp('md', 'xs');      // OK — 둘 다 SpaceKey
sp('md', 'huge');    // ✗ 에러! 'huge'는 SpaceKey에 없음
```

### 16-14. 전역 타입 확장 — window에 새 속성 추가

Electron의 preload.js가 `window.electronAPI`를 추가하지만, TypeScript는 이를 모른다. `declare global`로 알려준다:

```typescript
// src/shared/types/index.ts

// ElectronAPI의 모든 메서드를 타입으로 정의
export interface ElectronAPI {
  close: () => void;
  setOpacity: (value: number) => void;
  naverFetch: (url: string) => Promise<{ data?: unknown; error?: string }>;
  onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
  // ...
}

// Window 객체에 electronAPI 속성이 있다고 선언
declare global {
  interface Window {
    electronAPI?: ElectronAPI;  // ?는 "없을 수도 있다" (브라우저 환경)
  }
}
```

이렇게 하면:
```typescript
window.electronAPI?.close();
//                   ↑ 자동완성에 close, setOpacity, naverFetch 등이 뜬다
//                   ↑ close()의 반환타입은 void
//                   ↑ naverFetch의 파라미터가 string인 것을 검사
```

### 16-15. 이 프로젝트의 TypeScript 정리

| 패턴 | 어디서 사용 | 왜 사용 |
|------|------------|--------|
| `interface` | types/index.ts | 데이터 구조를 정의하여 오타/누락 방지 |
| 유니온 `\|` | SheetName, Direction | 허용할 값을 정확히 제한 |
| `?` 선택 속성 | StockSymbol.reutersCode | 없을 수 있는 필드 표현 |
| `?.` 옵셔널 체이닝 | electronAPI?.close() | null 안전 접근 |
| `as const` | tokens.ts | 디자인 토큰 값 변경 방지 |
| `Generic<T>` | fetchJSON\<T\>() | API 함수 하나로 여러 응답 타입 처리 |
| `as` 타입 단언 | API 응답 파싱 | "이 데이터는 이 구조야"라고 확인 |
| `Partial<T>` | updateSettings | 일부 필드만 업데이트 |
| `Pick<T>` | getNaverStockUrl | 필요한 필드만 요구 |
| `Record<K,V>` | prices 객체 | 동적 키의 타입 안전성 |
| `declare global` | ElectronAPI | window에 커스텀 속성 추가 |
| `ReturnType<T>` | timer ref | 함수 반환 타입 자동 추출 |

---

## 17. Electron — 웹 기술로 데스크톱 앱 만들기

Electron은 **웹 기술(HTML/CSS/JS)로 데스크톱 앱을 만드는 프레임워크**다. Chrome 브라우저를 앱 안에 내장한 것이라고 이해하면 된다.

### 17-1. 프로세스 구조

```
┌─────────────────────────────────────────────┐
│  Main Process (Node.js)                     │
│  electron/main.js                           │
│                                             │
│  - 창(BrowserWindow) 생성/관리               │
│  - 시스템 트레이                              │
│  - 파일 시스템 접근                           │
│  - 네이티브 API 호출                          │
│  - 네트워크 요청 (CORS 제한 없음)             │
│                                             │
│       ▲ IPC (프로세스 간 통신) ▼               │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Renderer Process (Chromium)        │   │
│  │  React 앱 (src/)                     │   │
│  │                                      │   │
│  │  - UI 렌더링                         │   │
│  │  - 사용자 인터랙션                    │   │
│  │  - preload.js를 통해 Main과 통신     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**보안 원칙:** Renderer(React)는 Node.js API에 직접 접근할 수 없다. 반드시 preload.js가 노출한 안전한 API만 사용한다.

### 17-2. Preload — 보안 브릿지

```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// React에서 window.electronAPI.xxx 로 접근 가능한 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 1. 단방향 메시지 (응답 없음)
  close: () => ipcRenderer.send('window-close'),
  setOpacity: (value) => ipcRenderer.send('set-opacity', value),

  // 2. 양방향 메시지 (응답을 Promise로 받음)
  naverFetch: (url) => ipcRenderer.invoke('naver-fetch', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 3. 이벤트 구독 (cleanup 함수 반환)
  onUpdateAvailable: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
    //     ↑ React의 useEffect cleanup에서 호출하여 메모리 누수 방지
  },
});
```

### 17-3. Main Process — 시스템 기능

**창 만들기:**

```javascript
// electron/main.js
const mainWindow = new BrowserWindow({
  width: 420,
  height: 680,
  frame: false,          // OS 기본 제목표시줄 숨김 → 커스텀 TitleBar 사용
  transparent: true,     // 투명 배경 → 둥근 모서리 구현 가능
  skipTaskbar: true,     // 작업표시줄에 안 보임 → 트레이에서만 관리
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,   // 보안: Renderer와 Main 격리
    nodeIntegration: false,   // 보안: Renderer에서 Node.js 사용 불가
  },
});
```

**닫기 = 숨기기 (트레이 상주):**

```javascript
// X 버튼 → 창을 숨기기만 함 (완전 종료 아님)
mainWindow.on('close', (e) => {
  if (!app.isQuitting) {
    e.preventDefault();   // 기본 동작(종료) 막기
    mainWindow.hide();    // 창만 숨김
  }
});
```

**시스템 트레이:**

```javascript
function createTray() {
  tray = new Tray(trayIcon);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '열기', click: () => mainWindow.show() },
    { label: '항상 위에', type: 'checkbox', ... },
    { label: '업데이트 확인', click: () => autoUpdater.checkForUpdates() },
    { label: '종료', click: () => { app.isQuitting = true; app.quit(); } },
  ]));

  // 트레이 클릭 → 창 보이기 (깜빡임 방지 처리 포함)
  tray.on('click', () => {
    withWindow(w => {
      if (!w.isVisible()) {
        w.setOpacity(0);     // 먼저 투명하게
        w.show();            // 창 표시
        // 2프레임 기다린 후 보이기 (렌더링 완료 보장)
        w.webContents
          .executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
          .then(() => w.setOpacity(1));
      }
    });
  });
}
```

### 17-4. IPC 핸들러 패턴

```javascript
// electron/main.js

// 패턴 1: ipcMain.on — 단방향 (Renderer → Main, 응답 없음)
ipcMain.on('window-close', () => withWindow(w => w.hide()));
ipcMain.on('set-opacity', (_, value) => withWindow(w => w.setOpacity(value)));

// 패턴 2: ipcMain.handle — 양방향 (Renderer → Main → Renderer)
ipcMain.handle('get-window-size', () => {
  const [width, height] = mainWindow.getSize();
  return { width, height };   // React에서 await로 받을 수 있음
});

// 패턴 3: webContents.send — 역방향 (Main → Renderer)
mainWindow.webContents.send('update-available', { version: '1.0.5' });
```

### 17-5. CORS 프록시 — 왜 필요한가?

브라우저에는 **CORS(Cross-Origin Resource Sharing)** 보안 정책이 있다. `stock-orbit` 앱에서 `stock.naver.com` API를 직접 호출하면 브라우저가 차단한다.

**해결:** 네트워크 요청을 Electron Main Process를 경유시킨다. Main Process는 Node.js이므로 CORS 제한이 없다.

```
React 앱                    Electron Main             Naver API
   │                            │                        │
   ├── IPC: naverFetch(url) ──→│                        │
   │                            ├── fetch(url) ────────→│
   │                            │←── JSON 응답 ─────────┤
   │←── { data: ... } ─────────┤                        │
```

```javascript
// electron/main.js
ipcMain.handle('naver-fetch', async (_, url) => {
  // 보안: 네이버 도메인만 허용
  const parsed = new URL(url);
  if (!isAllowedHost(parsed.host)) {
    return { error: 'host not allowed' };
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 ...' },
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
});

// 허용 도메인 검사
const isAllowedHost = (host) =>
  host === 'naver.com' || host.endsWith('.naver.com');
```

### 17-6. 단일 인스턴스

```javascript
// 앱을 중복 실행하면 기존 창을 포커스하고, 새 프로세스는 종료
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}
```

### 17-7. 자동 업데이트

```javascript
// electron-updater — GitHub Releases 기반 자동 업데이트
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Main → Renderer 이벤트 전달
autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update-available', { version: info.version });
});
autoUpdater.on('download-progress', (p) => {
  mainWindow.webContents.send('update-progress', {
    percent: Math.round(p.percent),
    transferred: p.transferred,
    total: p.total,
  });
});
autoUpdater.on('update-downloaded', (info) => {
  mainWindow.webContents.send('update-downloaded', { version: info.version });
});

// 6시간마다 자동 체크
setInterval(() => autoUpdater.checkForUpdates(), 6 * 60 * 60 * 1000);
```

---

## 18. 실전 아키텍처 패턴

### 18-1. Smart Parent / Dumb Children

**Smart(똑똑한) 컴포넌트:** 상태와 로직을 관리
**Dumb(단순한) 컴포넌트:** props를 받아서 화면만 그림

```
App (Smart)
 ├─ 상태: settings, presets, prices
 ├─ 로직: toggleTheme, handleClose, refresh
 └─ 자식에게 필요한 데이터와 콜백만 전달
     │
     ├── TitleBar (Dumb) — isDark, opacity, onClose만 받아서 표시
     ├── PresetTabs (Dumb) — presets, activeId, onSelect만 받아서 표시
     └── StatusBar (Dumb) — lastUpdated, loading만 받아서 표시
```

### 18-2. SheetManager — 모달 관리 분리

App.tsx에 10개 Sheet가 나열되어 있으면 가독성이 떨어진다. SheetManager가 이를 대신 관리한다:

```tsx
// src/app/SheetManager.tsx
export const SheetManager = memo(({ marqueeItems }) => {
  // Store에서 필요한 값을 직접 가져옴 — prop drilling 제거
  const openSheet = useStore(s => s.openSheet);
  const setSheet = useStore(s => s.setSheet);
  const addSymbol = useStore(s => s.addSymbol);
  // ...

  return (
    <QueryErrorBoundary>
      <SearchSheet open={openSheet === 'search'} ... />
      <SettingsSheet open={openSheet === 'settings'} ... />
      <RankingSheet open={openSheet === 'ranking'} ... />
      <NewsSheet open={openSheet === 'news'} ... />
      {/* ... */}
    </QueryErrorBoundary>
  );
});
```

### 18-3. memo — 리렌더링 방지

```tsx
export const SheetManager = memo(({ marqueeItems }) => { ... });
```

`memo`는 props가 변경되지 않았으면 컴포넌트를 다시 그리지 않는다. 부모가 리렌더되더라도 `marqueeItems` 참조가 같으면 SheetManager는 이전 결과를 재사용한다.

### 18-4. 데이터 흐름 정리

```
API 응답 → transform (naver.ts) → 상태 저장 (React Query) → ViewModel 훅 → UI 렌더링
```

- `naver.ts`: API 원시 응답을 `StockPrice` 타입으로 변환
- `useStockPrices`: React Query로 캐싱 + 자동 갱신
- `useStockViewModel`: `StockPrice`를 화면 표시용 문자열로 변환
- `StockRow`: ViewModel의 값을 그대로 출력

**컴포넌트에서 직접 데이터 변환을 하지 않는다.**

---

## 19. API 통신과 Rate-Limit 처리

### 19-1. 배치 요청

30개 종목을 한꺼번에 요청하면 서버가 차단할 수 있다. 10개씩 나눠서 3초 간격으로 요청한다.

```tsx
// src/features/stock/hooks/useStockPrices.ts
const fetchInBatches = async (symbols, onProgress) => {
  const out = {};

  // 10개 이하면 한 번에
  if (symbols.length <= 10) {
    await runBatch(symbols);
    return out;
  }

  // 10개씩 쪼개서
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    await runBatch(batch);                              // 10개 병렬 요청
    onProgress?.(done / total);                         // 진행률 보고
    if (i + BATCH_SIZE < symbols.length) await sleep(3000);  // 3초 대기
  }
  return out;
};
```

### 19-2. Rate-Limit 백오프

서버가 429(Too Many Requests)를 응답하면 **지수 백오프(exponential backoff)**로 요청 간격을 점차 늘린다:

```tsx
// src/shared/naver.ts
let backoffMs = 1_000;       // 시작: 1초
let backoffUntil = 0;
let lastRateLimitAt = 0;

const markRateLimit = (url: string) => {
  lastRateLimitAt = Date.now();
  backoffMs = Math.min(backoffMs * 2, 5 * 60 * 1_000);  // 2배씩 증가, 최대 5분
  // ±20% 지터(jitter) — 여러 요청이 동시에 깨어나는 것 방지
  const jittered = backoffMs * (0.8 + Math.random() * 0.4);
  backoffUntil = Date.now() + jittered;
};
```

**백오프 → 1초 → 2초 → 4초 → 8초 → ... → 최대 5분**

**핵심 규칙:**
- 단일 성공으로 리셋하지 않음 — 배치 중 일부만 429가 나올 수 있으므로
- 마지막 rate-limit 이후 **2분간** 추가 rate-limit이 없으면 그때 리셋
- 지터(jitter): ±20% 랜덤 오프셋으로 "thundering herd" 방지

```tsx
const maybeResetBackoff = () => {
  if (lastRateLimitAt > 0 && Date.now() - lastRateLimitAt > 2 * 60 * 1_000) {
    backoffMs = 1_000;   // 초기화
    lastRateLimitAt = 0;
  }
};
```

### 19-3. 분류 → 배치 — 종목 유형별로 다른 API에 묶어서 호출

```tsx
// src/features/stock/hooks/useStockPrices.ts

// 1. 종목을 유형별로 분류
const { domesticStocks, overseasStocks, indexFutures } = classifySymbols(symbols);

// 2. 국내주식: 10개씩 묶어서 1회 요청 (polling API)
for (let i = 0; i < domesticStocks.length; i += BATCH_SIZE) {
  const codes = batch.map(s => s.code);
  const result = await fetchDomesticStocksBatch(codes);  // 005930,000660 → 1회 요청
  Object.assign(out, result);
}

// 3. 해외주식: 10개씩 묶어서 1회 요청 (polling.finance.naver.com)
for (let i = 0; i < overseasStocks.length; i += BATCH_SIZE) {
  const reutersCodes = batch.map(s => s.reutersCode || s.code);
  const result = await fetchOverseasStocksBatch(reutersCodes);  // NVDA.O,AAPL.O → 1회 요청
}

// 4. 지수/선물: 기존 개별 API (종목 수가 적고 배치 미지원)
const results = await Promise.allSettled(indexFutures.map(fetchOneIndexFutures));
```

---

## 20. 에러 처리 전략

### 20-1. Error Boundary — React 에러 캐치

React 컴포넌트의 렌더링 중 에러가 발생하면 **전체 앱이 흰 화면**이 된다. Error Boundary가 이를 방지한다.

```tsx
// src/shared/ui/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: undefined };

  // 에러가 나면 이 함수가 호출됨
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  // 에러 로깅
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // 에러 시 보여줄 대체 UI
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }
    return this.props.children;  // 정상이면 자식을 그대로 렌더
  }
}
```

> Error Boundary는 class 컴포넌트로만 만들 수 있다. 이것은 React의 제한사항이다.

### 20-2. Logger — 구조화된 로깅

```tsx
// src/shared/utils/logger.ts
export const logger = {
  info: (msg, detail?) => logger.log('info', msg, detail),
  warn: (msg, detail?) => logger.log('warn', msg, detail),
  error: (msg, detail?) => logger.log('error', msg, detail),
  api: (msg, detail?) => logger.log('api', msg, detail),

  log(level, message, detail?) {
    // 최대 500개만 유지
    _logs = [{ id: ++_id, timestamp: new Date(), level, message, detail }, ..._logs];
    if (_autoClean && _logs.length > MAX_LOGS) _logs = _logs.slice(0, MAX_LOGS);
    notify();  // 구독자에게 알림 (설정 화면의 로그 뷰어용)
  },

  // 구독 패턴 — 외부에서 로그 변경을 감지
  subscribe: (fn) => {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  },
};

// 전역 에러 자동 캡처
window.addEventListener('error', (e) => {
  logger.error('Uncaught Error', `${e.message} at ${e.filename}:${e.lineno}`);
});
window.addEventListener('unhandledrejection', (e) => {
  logger.error('Unhandled Promise', String(e.reason));
});
```

### 20-3. 데이터 마이그레이션

앱이 업데이트되면서 데이터 형식이 바뀔 수 있다. 이전 버전의 데이터를 새 형식으로 변환하는 마이그레이션 함수:

```tsx
// src/app/store/index.ts
// 구버전: "005930" (문자열) → 신버전: { code: '005930', name: '삼성전자', ... } (객체)
const migrateSymbols = (symbols: unknown[]): StockSymbol[] =>
  symbols.map(s => {
    if (typeof s === 'string') {
      const isKR = /^\d{6}$/.test(s);
      return {
        code: isKR ? s : s,
        name: s,
        market: isKR ? 'KRX' : 'US',
        nation: isKR ? 'KR' : 'US',
      };
    }
    if (typeof s === 'object' && s !== null && 'code' in s) return s as StockSymbol;
    return null;
  }).filter(Boolean) as StockSymbol[];
```

---

## 정리: 이 프로젝트에서 배울 수 있는 것

| 영역 | 기술 | 이 프로젝트에서 배울 점 |
|------|------|----------------------|
| **React 기초** | JSX, 컴포넌트, Props, State | 실제 앱에서 어떻게 조합되는지 |
| **React Hooks** | useState, useEffect, useMemo, useCallback, useRef | 각 훅의 목적과 올바른 사용 시점 |
| **커스텀 훅** | ViewModel, BackAction, OutsideClick | 로직 재사용과 관심사 분리 |
| **상태 관리** | Zustand, Selector, 불변성 | Redux 없이 간단하게 전역 상태 관리 |
| **서버 상태** | React Query, 캐싱, 자동 갱신 | 서버 데이터와 클라이언트 상태의 분리 |
| **스타일링** | Emotion, 디자인 토큰, CSS 변수 | 테마 시스템과 제로 런타임 스타일링 |
| **TypeScript** | Interface, Generic, 유틸리티 타입 | 타입으로 코드 안전성 확보 |
| **Electron** | IPC, Preload, Tray, 자동 업데이트 | 웹 기술로 데스크톱 앱 만들기 |
| **API 설계** | 배치 요청, Rate-Limit, CORS 프록시 | 실제 서비스 API와 안전하게 통신 |
| **아키텍처** | 기능별 폴더, Smart/Dumb, SRP | 확장 가능한 프로젝트 구조 설계 |
| **에러 처리** | Error Boundary, Logger, 마이그레이션 | 앱 안정성을 위한 다중 방어막 |
