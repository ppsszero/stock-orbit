import { AppSettings, StockPrice, StockSymbol, WebviewSource } from '@/shared/types';

/**
 * 종목 클릭 시 웹뷰 소스 결정 — 순수 함수 (unit test 대상).
 *
 * 데이마켓(US + OVERNIGHT)에서만 설정이 개입하고, 그 외엔 항상 네이버:
 * - 비 US / price 미수신 / REGULAR·PRE·AFTER·CLOSED → 'naver' (기존 동작)
 * - 데이마켓 → 설정값 그대로 ('ask'면 호출부가 선택 모달을 띄움)
 */
export const decideWebviewSource = (
  sym: Pick<StockSymbol, 'nation'>,
  price: Pick<StockPrice, 'marketStatus'> | undefined,
  setting: AppSettings['daymarketWebviewSource'],
): 'ask' | WebviewSource => {
  const isDaymarket = sym.nation === 'US' && price?.marketStatus === 'OVERNIGHT';
  return isDaymarket ? setting : 'naver';
};
