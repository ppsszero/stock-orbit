import { calcDisplayPrice } from '../utils/currency';
import { StockPrice } from '../../types';

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

describe('calcDisplayPrice', () => {
  describe('Korean stock (KRW currency)', () => {
    it('in KRW mode returns price as-is with ₩ prefix', () => {
      const result = calcDisplayPrice(mockKRPrice, 'KRW', 1300);
      expect(result.price).toBe(72000);
      expect(result.change).toBe(1000);
      expect(result.prefix).toBe('₩');
      expect(result.currency).toBe('KRW');
    });

    it('in USD mode still returns KRW price with ₩ prefix (Korean stocks always shown in KRW)', () => {
      const result = calcDisplayPrice(mockKRPrice, 'USD', 1300);
      expect(result.price).toBe(72000);
      expect(result.change).toBe(1000);
      expect(result.prefix).toBe('₩');
      expect(result.currency).toBe('KRW');
    });
  });

  describe('US stock (USD currency)', () => {
    it('in USD mode returns price as-is with $ prefix', () => {
      const result = calcDisplayPrice(mockUSPrice, 'USD', 1300);
      expect(result.price).toBe(150.5);
      expect(result.change).toBe(2.5);
      expect(result.prefix).toBe('$');
      expect(result.currency).toBe('USD');
    });

    it('in KRW mode converts price using usdkrw rate with ₩ prefix', () => {
      const usdkrw = 1300;
      const result = calcDisplayPrice(mockUSPrice, 'KRW', usdkrw);
      expect(result.price).toBe(150.5 * 1300);
      expect(result.change).toBe(2.5 * 1300);
      expect(result.prefix).toBe('₩');
      expect(result.currency).toBe('KRW');
    });

    it('in KRW mode with usdkrw 0 falls back to rate 1', () => {
      const result = calcDisplayPrice(mockUSPrice, 'KRW', 0);
      expect(result.price).toBe(150.5);
      expect(result.change).toBe(2.5);
      expect(result.prefix).toBe('₩');
      expect(result.currency).toBe('KRW');
    });
  });

  describe('change is always absolute value', () => {
    it('returns absolute change for negative change value', () => {
      const downPrice: StockPrice = {
        ...mockUSPrice,
        change: -3.0,
        changeDirection: 'down',
      };
      const result = calcDisplayPrice(downPrice, 'USD', 1300);
      expect(result.change).toBe(3.0);
    });

    it('returns absolute change for negative KRW change', () => {
      const downPrice: StockPrice = {
        ...mockKRPrice,
        change: -500,
        changeDirection: 'down',
      };
      const result = calcDisplayPrice(downPrice, 'KRW', 1300);
      expect(result.change).toBe(500);
    });

    it('returns absolute change for negative USD change converted to KRW', () => {
      const downPrice: StockPrice = {
        ...mockUSPrice,
        change: -2.5,
        changeDirection: 'down',
      };
      const result = calcDisplayPrice(downPrice, 'KRW', 1300);
      expect(result.change).toBe(2.5 * 1300);
    });
  });
});
