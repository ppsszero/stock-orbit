# 설계: `naver.ts` 도메인 분할

- **날짜:** 2026-06-02
- **브랜치:** `refactor/naver-split`
- **유형:** Refactor (구조 변경, 동작 불변)
- **헌법 라우팅:** Architect → 본 사양 → User OK → Implementer → Reviewer

---

## 1. 배경 / 문제

`src/shared/naver.ts`는 1162줄, public export 24개의 **god-module**이다. 다음 큰 파일(416줄)의 약 3배이며, 데이터/API 레이어 전체가 단일 파일에 들어 있다.

한 파일이 16개 도메인을 담당한다: 종목(국내/해외), 지수, 선물, 원자재, 환율, 검색, 투자자동향, 랭킹, 뉴스, 리서치, 섹터, 머니스토리, 경제캘린더, 금리, 채권수익률, URL 빌더.

→ 헌법 9·17 "한 파일 = 하나의 책임" 위반. 뉴스 하나를 고치려 종목 API 파일을 열어야 하고, 변환 로직(과거 콤마 잘림·부호 판정·폴링 사고가 모인 영역)이 fetch와 엉켜 단위 테스트가 사실상 불가능하다.

**현재 구조의 다행인 점:** 책임이 풀기 어렵게 엉킨 게 아니라, 이미 깔끔히 줄 세워진 도메인들이 한 파일에 모여 있을 뿐이다. 각 도메인은 `raw 타입 → transform(순수함수) → fetch` 패턴을 따른다. 공용 코어(`fetchJSON` 백오프 상태머신, `num`, `parseDir`, 종목/지수/선물 공유 `parsePollingData`)도 분리돼 있다. 따라서 분할 위험은 낮다.

## 2. 목표 / 비목표

**목표 (우선순위순)**
1. **데이터 정합성** — 변환 로직을 순수함수로 분리해 단위 테스트 가능하게. (사용자 1순위)
2. **유지보수성** — 도메인별 격리. 한 도메인 수정 시 다른 도메인 파일을 건드리지 않음.

**비목표**
- fetch 추상화 계층 재설계 / 통일 에러 타입 체계 / 응답 정규화 파이프라인 → **불필요**. `fetchJSON`은 이미 단일 choke point + 백오프/쿨다운을 갖췄고, 반환 타입은 이미 도메인 모델(`StockPrice`, `SectorOverview`)이다. (YAGNI, 헌법 22)
- 소비자 코드 변경 → barrel로 회피.
- 동작 변경 → 순수 이동 리팩터.

## 3. 결정 사항 (브레인스토밍 합의)

| 항목 | 결정 |
|---|---|
| 접근 | 도메인별 모듈 분리 + transform 순수함수 분리 + 단위 테스트 ("1번") |
| transform 입자도 | **하이브리드** — 작은 transform은 도메인 파일에서 export, 크고 공유되는 `parsePollingData`만 `polling.ts`로 독립 |
| 타입 | Naver raw 응답 타입 전부 `naver/types.ts` 한 곳으로 통합 (기존 `naver-types.ts` + 인라인 타입) |
| 테스트 범위 | 정합성 핵심 우선 — 실제 데이터 가공 transform 전부. 단순 라벨 맵 제외 |
| 하위호환 | `naver/index.ts` barrel로 24개 export 그대로 노출. 소비자 22곳 import 불변 |

## 4. 폴더 구조

`src/shared/naver.ts` → `src/shared/naver/` 폴더:

```
src/shared/naver/
  index.ts        ← barrel. 현재 24개 public export 전부 re-export
  client.ts       ← 공용 코어 (네트워크 + 파싱 원자)
  types.ts        ← Naver raw 응답 타입 전부 (naver-types.ts + 인라인 통합)
  polling.ts      ← parsePollingData + 폴링 타입 (종목/지수/선물 공유)
  stocks.ts       ← searchStocks, fetchDomesticStocksBatch, fetchOverseasStocksBatch
  indices.ts      ← fetchDomesticIndex, fetchOverseasIndex, fetchOverseasFutures,
                     fetchDomesticIndices, fetchWorldIndices
  commodities.ts  ← parseCommodityItem, fetchCommodities
  fx.ts           ← fetchFXRates
  investor.ts     ← toSigned, fetchInvestorData
  ranking.ts      ← parseForeignDir, fetchDomesticRanking, fetchForeignRanking,
                     fetchMarketBriefing
  news.ts         ← parseNewsDatetime, fetchNewsByCategory, fetchMoneyStory
  research.ts     ← fetchResearchByCategory
  sectors.ts      ← dirFromFluctuationsType, fetchSectors
  calendar.ts     ← parseIndicator, fetchEconomicCalendar
  interest.ts     ← parseInterestRate, fetchStandardInterest, fetchDomesticInterest,
                     fetchBondYield
  urls.ts         ← getNaverStockUrl, getNewsUrl (헌법 6.4 URL 단일화)
  __tests__/      ← transform 단위 테스트
```

**`client.ts` 내용:** `fetchJSON<T>`, `num`, `parseDir`, `describeApi`(내부), 백오프 상태머신(`isRateLimitError`/`markRateLimit`/`maybeResetBackoff`), 상수(`BASE`/`MOBILE_BASE`/백오프), 라벨 맵(`ORDER_TYPE_LABELS`/`NATION_LABELS`).

## 5. 의존성 방향 (순환 없음)

```
모든 도메인 ──▶ client.ts          (client는 아무것도 import 안 함, 최하단)
stocks/indices ──▶ polling.ts ──▶ client.ts
모든 도메인 ──▶ types.ts            (타입만)
urls.ts ──▶ (독립, client 불필요)
index.ts ──▶ 전부 re-export        (최상단)
```

단방향 acyclic. 순환 import 발생 불가.

## 6. 데이터 흐름 & 하위호환

```
소비자 22곳: import { fetchSectors } from '@/shared/naver'   ← 불변
   │  (@/shared/naver → naver/index.ts barrel 자동 해석)
   ▼
fetchSectors (sectors.ts)
   ├─ client.fetchJSON<SectorRaw>(url)   ← 네트워크 + 백오프
   └─ dirFromFluctuationsType(raw)       ← 순수 변환 (테스트 대상)
   ▼
SectorOverview (도메인 모델, @/shared/types)
```

소비자 영향 = 0. barrel이 24개 export를 그대로 노출 → import 경로/심볼 불변. 로직도 이동만, 변경 없음.

### 보존 대상 public export (24개)

`searchStocks`, `fetchDomesticStocksBatch`, `fetchOverseasStocksBatch`, `fetchDomesticIndex`, `fetchOverseasIndex`, `fetchOverseasFutures`, `fetchDomesticIndices`, `fetchWorldIndices`, `fetchCommodities`, `fetchFXRates`, `fetchInvestorData`, `fetchDomesticRanking`, `fetchForeignRanking`, `fetchMarketBriefing`, `fetchNewsByCategory`, `fetchResearchByCategory`, `fetchSectors`, `fetchMoneyStory`, `getNewsUrl`, `getNaverStockUrl`, `fetchEconomicCalendar`, `fetchStandardInterest`, `fetchDomesticInterest`, `fetchBondYield`.

## 7. 테스트 (정합성 핵심 우선)

`src/shared/naver/__tests__/` 에 vitest 단위 테스트. **네트워크 모킹 없이** raw fixture → 순수함수 → 기대 도메인 객체 검증.

**대상:**
- `parsePollingData` — 가격/부호/시총/스팬 (폴링 사고 영역)
- `num` — 콤마 잘림 (`"1,402"` → `1402`)
- `parseInterestRate`, `parseForeignDir`, `parseCommodityItem`, `parseIndicator`, `dirFromFluctuationsType`, `parseNewsDatetime`, `toSigned`

**제외:** `FX_NAMES`/`NATION_LABELS` 등 단순 라벨 맵.

**케이스:** 각 transform당 정상 + 엣지(누락/0/콤마/부호코드 `1·2·4·5`/flat).

## 8. 마이그레이션 절차

1. `naver/` 폴더 생성. 의존 최하단부터: `client.ts` → `types.ts` → `polling.ts`
2. 도메인 파일 12개(stocks, indices, commodities, fx, investor, ranking, news, research, sectors, calendar, interest, urls)로 코드 **이동**(로직 변경 X), 모듈 간 import 연결. `getNewsUrl`은 `urls.ts`, 내부용 `buildNewsArticleUrl`은 `news.ts`에 유지
3. `index.ts` barrel 작성 → 24개 export 검증
4. 기존 `naver-types.ts`를 **직접** import하는 다른 파일 grep 확인 후 처리 (있으면 `@/shared/naver` 또는 `naver/types`로 경로 정리)
5. 기존 `src/shared/naver.ts` 삭제
6. `npx tsc --noEmit` 0 에러 + `npx eslint src/shared/naver` 0 경고 (헌법 11.1)
7. `__tests__` 작성 → `npm run test:run` green
8. 기존 테스트(`src/app/store/__tests__` 등) 영향 없음 확인

## 9. 위험 평가: 낮음

- 순수 이동이라 tsc가 깨진 참조 전부 잡음
- 주의점: 모듈 간 내부 참조 배선(`indices`→`polling`, `ranking`의 `fetchMarketBriefing`, `news`↔`urls`의 `getNewsUrl`) — tsc로 검증
- 순환 import 가능성 없음 (5절 단방향 구조)
- barrel 덕에 런타임 동작/소비자 불변 → 회귀 표면 최소
- 검증 게이트: tsc + eslint + vitest 3종

## 10. 완료 기준

- [ ] `src/shared/naver/` 12개 도메인 파일 + client/types/polling 코어 + index barrel 구성
- [ ] 기존 `naver.ts`, `naver-types.ts` 제거
- [ ] 24개 public export barrel로 보존, 소비자 22곳 import 불변
- [ ] `npx tsc --noEmit` 0 에러
- [ ] `npx eslint` 0 경고
- [ ] 정합성 핵심 transform 단위 테스트 green
- [ ] 기존 테스트 전부 green
