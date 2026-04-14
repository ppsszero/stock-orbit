import { fmtNum, fmtTime, mapNationCode, getDisplayName } from '../format';
import { StockPrice, StockSymbol } from '../../types';

describe('fmtNum', () => {
  it('formats KRW with no decimal places', () => {
    const result = fmtNum(72000, 'KRW');
    expect(result).toBe('72,000');
  });

  it('formats large KRW number with commas', () => {
    const result = fmtNum(1234567, 'KRW');
    expect(result).toBe('1,234,567');
  });

  it('formats JPY with no decimal places (same as KRW)', () => {
    const result = fmtNum(15000, 'JPY');
    expect(result).toBe('15,000');
  });

  it('formats USD with 2 decimal places', () => {
    const result = fmtNum(150.5, 'USD');
    expect(result).toBe('150.50');
  });

  it('formats USD integer with 2 decimal places', () => {
    const result = fmtNum(100, 'USD');
    expect(result).toBe('100.00');
  });

  it('formats USD with comma separators', () => {
    const result = fmtNum(1234.56, 'USD');
    expect(result).toBe('1,234.56');
  });

  it('formats zero correctly for KRW', () => {
    expect(fmtNum(0, 'KRW')).toBe('0');
  });

  it('formats zero correctly for USD', () => {
    expect(fmtNum(0, 'USD')).toBe('0.00');
  });
});

describe('fmtTime', () => {
  it('returns formatted string for a valid Date', () => {
    const d = new Date('2024-03-15T14:30:45');
    const result = fmtTime(d);
    // Should contain month, day, hour, minute, second
    expect(result).toBeTruthy();
    expect(result).not.toBe('--');
    // Verify it contains expected numeric parts
    expect(result).toContain('03');
    expect(result).toContain('15');
    expect(result).toContain('14');
    expect(result).toContain('30');
    expect(result).toContain('45');
  });

  it('returns "--" for null', () => {
    expect(fmtTime(null)).toBe('--');
  });
});

describe('mapNationCode', () => {
  it('maps KOR to KR', () => {
    expect(mapNationCode('KOR')).toBe('KR');
  });

  it('maps USA to US', () => {
    expect(mapNationCode('USA')).toBe('US');
  });

  it('maps JPN to JP', () => {
    expect(mapNationCode('JPN')).toBe('JP');
  });

  it('maps CHN to CN', () => {
    expect(mapNationCode('CHN')).toBe('CN');
  });

  it('maps HKG to HK', () => {
    expect(mapNationCode('HKG')).toBe('HK');
  });

  it('maps GBR to UK', () => {
    expect(mapNationCode('GBR')).toBe('UK');
  });

  it('maps DEU to DE', () => {
    expect(mapNationCode('DEU')).toBe('DE');
  });

  it('returns "INT" for undefined', () => {
    expect(mapNationCode(undefined)).toBe('INT');
  });

  it('returns the code itself for unknown codes', () => {
    expect(mapNationCode('FRA')).toBe('FRA');
  });

  it('returns "INT" for empty string', () => {
    expect(mapNationCode('')).toBe('INT');
  });
});

describe('getDisplayName', () => {
  const mockKRSymbol: StockSymbol = {
    code: '005930',
    name: '삼성전자',
    market: 'KOSPI',
    nation: 'KR',
  };

  const mockUSSymbol: StockSymbol = {
    code: 'AAPL',
    name: 'Apple Inc',
    market: 'NASDAQ',
    nation: 'US',
  };

  const mockKRPrice: StockPrice = {
    code: '005930',
    name: '삼성전자',
    nation: 'KR',
    market: 'KOSPI',
    currentPrice: 72000,
    previousClose: 71000,
    change: 1000,
    changePercent: 1.41,
    changeDirection: 'up',
    currency: 'KRW',
    marketStatus: 'OPEN',
    updatedAt: '2024-01-01',
  };

  const mockUSPrice: StockPrice = {
    code: 'AAPL',
    name: 'Apple Inc',
    nation: 'US',
    market: 'NASDAQ',
    currentPrice: 150.5,
    previousClose: 148.0,
    change: 2.5,
    changePercent: 1.69,
    changeDirection: 'up',
    currency: 'USD',
    marketStatus: 'OPEN',
    updatedAt: '2024-01-01',
  };

  it('returns Korean name for Korean stock', () => {
    expect(getDisplayName(mockKRPrice, mockKRSymbol)).toBe('삼성전자');
  });

  it('returns code for foreign stock with non-Korean name', () => {
    expect(getDisplayName(mockUSPrice, mockUSSymbol)).toBe('AAPL');
  });

  it('returns Korean name for foreign stock with Korean characters in name', () => {
    const priceWithKorean: StockPrice = {
      ...mockUSPrice,
      name: '애플',
    };
    expect(getDisplayName(priceWithKorean, mockUSSymbol)).toBe('애플');
  });

  it('returns name from symbol when price is null', () => {
    expect(getDisplayName(null, mockKRSymbol)).toBe('삼성전자');
  });

  it('returns empty string when both price and symbol have no name', () => {
    const emptySym: StockSymbol = { code: 'X', name: '', market: '', nation: 'US' };
    expect(getDisplayName(null, emptySym)).toBe('');
  });

  it('returns name when nation is not set on symbol', () => {
    const noNationSym: StockSymbol = { code: 'X', name: 'Test', market: '', nation: '' };
    expect(getDisplayName(null, noNationSym)).toBe('Test');
  });
});
