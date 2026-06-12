import { describe, it, expect } from 'vitest';
import { decideWebviewSource } from '../utils/webviewSource';
import { MarketSession } from '@/shared/types';

const us = { nation: 'US' as const };
const kr = { nation: 'KR' as const };
const price = (marketStatus: MarketSession) => ({ marketStatus });

describe('decideWebviewSource', () => {
  it('데이마켓(US + OVERNIGHT)이면 설정값을 그대로 반환한다', () => {
    expect(decideWebviewSource(us, price('OVERNIGHT'), 'ask')).toBe('ask');
    expect(decideWebviewSource(us, price('OVERNIGHT'), 'naver')).toBe('naver');
    expect(decideWebviewSource(us, price('OVERNIGHT'), 'yahoo')).toBe('yahoo');
  });

  it('데이마켓 외 세션은 설정과 무관하게 네이버', () => {
    const sessions: MarketSession[] = ['REGULAR', 'PRE', 'AFTER', 'CLOSED'];
    for (const s of sessions) {
      expect(decideWebviewSource(us, price(s), 'yahoo')).toBe('naver');
      expect(decideWebviewSource(us, price(s), 'ask')).toBe('naver');
    }
  });

  it('비 US 종목은 OVERNIGHT여도 네이버', () => {
    expect(decideWebviewSource(kr, price('OVERNIGHT'), 'yahoo')).toBe('naver');
    expect(decideWebviewSource({ nation: 'JP' }, price('OVERNIGHT'), 'ask')).toBe('naver');
  });

  it('price 미수신이면 네이버 (기존 동작 유지)', () => {
    expect(decideWebviewSource(us, undefined, 'yahoo')).toBe('naver');
    expect(decideWebviewSource(us, undefined, 'ask')).toBe('naver');
  });
});
