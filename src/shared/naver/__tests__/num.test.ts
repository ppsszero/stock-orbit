import { describe, it, expect } from 'vitest';
import { num } from '../client';

describe('num', () => {
  it('콤마를 제거하고 숫자로 변환한다', () => {
    expect(num('1,402')).toBe(1402);
    expect(num('15,219,364')).toBe(15219364);
  });
  it('소수점을 보존한다', () => {
    expect(num('1,234.5')).toBe(1234.5);
  });
  it('음수 부호를 보존한다', () => {
    expect(num('-1,200')).toBe(-1200);
  });
  it('undefined/null/빈 문자열/비숫자는 0', () => {
    expect(num(undefined)).toBe(0);
    expect(num(null)).toBe(0);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
  });
});
