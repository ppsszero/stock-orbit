import { MarqueeItem } from '@/shared/types';
import { fmtPercentArrow } from '@/shared/utils/format';

/** 국내금(M04020000)은 원 단위(소수점 가변), 그 외는 소수점 2자리 고정 */
const getFractionDigits = (item: MarqueeItem): Intl.NumberFormatOptions => {
  const isDomesticGold = item.code === 'M04020000';
  return isDomesticGold
    ? { maximumFractionDigits: 2 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
};

/** 마퀴/시장지표 시트 공용 — 현재값 포맷 */
export const formatMarqueeValue = (item: MarqueeItem): string =>
  item.currentValue.toLocaleString(undefined, getFractionDigits(item));

/** 마퀴/시장지표 시트 공용 — change 절대값 포맷 (부호는 호출 측에서 dirSign/dirArrow 결합) */
export const formatMarqueeChange = (item: MarqueeItem): string =>
  Math.abs(item.change).toLocaleString(undefined, getFractionDigits(item));

/** 마퀴 티커 전용 — 화살표 + 절대 percent (flat이면 '─') */
export const formatMarqueePercent = (item: MarqueeItem): string =>
  fmtPercentArrow(item.changeDirection, item.changePercent);
