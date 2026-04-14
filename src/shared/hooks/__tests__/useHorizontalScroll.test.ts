import { renderHook } from '@testing-library/react';
import { useHorizontalScroll } from '../useHorizontalScroll';

// Mock ResizeObserver since jsdom doesn't support it
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
});

describe('useHorizontalScroll', () => {
  it('returns scrollRef, canScrollL, canScrollR, and scroll function', () => {
    const { result } = renderHook(() => useHorizontalScroll());

    expect(result.current.scrollRef).toBeDefined();
    expect(typeof result.current.canScrollL).toBe('boolean');
    expect(typeof result.current.canScrollR).toBe('boolean');
    expect(typeof result.current.scroll).toBe('function');
  });

  it('initial state has canScrollL and canScrollR as false (no element attached)', () => {
    const { result } = renderHook(() => useHorizontalScroll());

    expect(result.current.canScrollL).toBe(false);
    expect(result.current.canScrollR).toBe(false);
  });

  it('scrollRef starts as null', () => {
    const { result } = renderHook(() => useHorizontalScroll());

    expect(result.current.scrollRef.current).toBeNull();
  });

  it('scroll function does not throw when ref is null', () => {
    const { result } = renderHook(() => useHorizontalScroll());

    expect(() => {
      result.current.scroll(1);
      result.current.scroll(-1);
    }).not.toThrow();
  });

  it('accepts deps array parameter', () => {
    const dep = 'test';
    const { result } = renderHook(() => useHorizontalScroll([dep]));

    expect(result.current.canScrollL).toBe(false);
    expect(result.current.canScrollR).toBe(false);
  });
});
