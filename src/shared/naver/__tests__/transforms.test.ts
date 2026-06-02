import { describe, it, expect } from 'vitest';
import { parseInterestRate } from '../interest';
import { parseForeignDir } from '../ranking';
import { parseCommodityItem } from '../commodities';
import { parseIndicator } from '../calendar';
import { dirFromFluctuationsType } from '../sectors';
import { parseNewsDatetime } from '../news';
import { toSigned } from '../investor';
import type { InterestRateRaw, NaverCommodityItemRaw, NaverEconomicIndicatorRaw } from '../types';

describe('parseInterestRate', () => {
  it('부호 코드 매핑(1/2=up, 4/5=down, 3=flat)과 날짜 분리', () => {
    const base: InterestRateRaw = {
      name: '미국 기준금리', itemCode: 'US', closePrice: '4.50',
      fluctuations: '0.00', fluctuationsRatio: '-',
      localTradedAt: '2026-06-02T08:00:00', nationType: 'USA', nationName: '미국',
    };
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '2' } }).direction).toBe('up');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '1' } }).direction).toBe('up');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '5' } }).direction).toBe('down');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '4' } }).direction).toBe('down');
    expect(parseInterestRate({ ...base, fluctuationsType: { code: '3' } }).direction).toBe('flat');
    const r = parseInterestRate({ ...base, fluctuationsType: { code: '3' } });
    expect(r.rate).toBe('4.50');
    expect(r.date).toBe('2026-06-02');
    expect(r.code).toBe('US');
    expect(r.nation).toBe('USA');
  });
});

describe('parseForeignDir', () => {
  it('문자열 상태 매핑', () => {
    expect(parseForeignDir('RISING')).toBe(1);
    expect(parseForeignDir('UPPER_LIMIT')).toBe(1);
    expect(parseForeignDir('FALLING')).toBe(-1);
    expect(parseForeignDir('LOWER_LIMIT')).toBe(-1);
    expect(parseForeignDir('UNKNOWN')).toBe(0);
  });
  it('코드 객체 매핑과 undefined', () => {
    expect(parseForeignDir({ code: '2' })).toBe(1);
    expect(parseForeignDir({ code: '1' })).toBe(1);
    expect(parseForeignDir({ code: '5' })).toBe(-1);
    expect(parseForeignDir({ code: '4' })).toBe(-1);
    expect(parseForeignDir({ code: '3' })).toBe(0);
    expect(parseForeignDir(undefined)).toBe(0);
  });
});

describe('parseCommodityItem', () => {
  it('상승/하락 부호 반영', () => {
    const base: NaverCommodityItemRaw = {
      reutersCode: 'CLc1', name: 'WTI', closePrice: '78.50',
      fluctuations: '1.20', fluctuationsRatio: '1.55',
    };
    const up = parseCommodityItem({ ...base, fluctuationsType: { code: '2' } }, 'energy');
    expect(up.currentValue).toBe(78.5);
    expect(up.change).toBe(1.2);
    expect(up.changePercent).toBeCloseTo(1.55);
    expect(up.changeDirection).toBe('up');
    expect(up.code).toBe('CLc1');
    const down = parseCommodityItem({ ...base, fluctuationsType: { code: '5' } }, 'energy');
    expect(down.change).toBe(-1.2);
    expect(down.changePercent).toBeCloseTo(-1.55);
    expect(down.changeDirection).toBe('down');
  });
});

describe('parseIndicator', () => {
  it('국가코드/시간 포맷/발표여부 매핑', () => {
    const d: NaverEconomicIndicatorRaw = {
      name: 'CPI', nationType: 'USA', nationKoreanName: '미국',
      releaseDate: '20260610', releaseTime: '213000', isRelease: true,
      actualValue: 3.2, previousValue: 3.1, changeValue: 0.1,
      importance: 3, indicatorUnit: '%', period: 'May 2026',
    };
    const r = parseIndicator(d);
    expect(r.nation).toBe('US');
    expect(r.nationName).toBe('미국');
    expect(r.releaseTime).toBe('21:30');
    expect(r.isReleased).toBe(true);
    expect(r.importance).toBe(3);
    expect(r.unit).toBe('%');
  });
  it('releaseTime 빈 값은 빈 문자열', () => {
    const r = parseIndicator({ name: 'X', nationType: 'KOR', releaseTime: '' });
    expect(r.nation).toBe('KR');
    expect(r.releaseTime).toBe('');
    expect(r.importance).toBe(1);
  });
});

describe('dirFromFluctuationsType', () => {
  it('RISING/FALLING/그외 매핑', () => {
    expect(dirFromFluctuationsType('RISING')).toBe('up');
    expect(dirFromFluctuationsType('FALLING')).toBe('down');
    expect(dirFromFluctuationsType('UNCHANGED')).toBe('flat');
    expect(dirFromFluctuationsType(undefined)).toBe('flat');
  });
});

describe('parseNewsDatetime', () => {
  it('YYYYMMDDHHMMSS → ISO local', () => {
    expect(parseNewsDatetime('20260602153045')).toBe('2026-06-02T15:30:45');
  });
  it('14자 미만/undefined는 원본 또는 빈 문자열', () => {
    expect(parseNewsDatetime('123')).toBe('123');
    expect(parseNewsDatetime(undefined)).toBe('');
  });
});

describe('toSigned', () => {
  it('값을 그대로 보존하고 방향을 부호로 판단', () => {
    expect(toSigned('+12,345').value).toBe('+12,345');
    expect(toSigned('+12,345').direction).toBe('up');
    expect(toSigned('-9,800').direction).toBe('down');
    expect(toSigned('0').direction).toBe('flat');
  });
  it('undefined는 "0"으로 폴백', () => {
    expect(toSigned(undefined).value).toBe('0');
    expect(toSigned(undefined).direction).toBe('flat');
  });
});
