import { renderHook } from '@testing-library/react';
import { useBackAction } from '../useBackAction';

describe('useBackAction', () => {
  it('active일 때 Escape 키를 누르면 onBack이 호출된다', () => {
    const onBack = vi.fn();
    renderHook(() => useBackAction(true, onBack));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('active가 아닐 때 Escape 키를 눌러도 onBack이 호출되지 않는다', () => {
    const onBack = vi.fn();
    renderHook(() => useBackAction(false, onBack));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('마우스 뒤로 버튼(button 3)으로 onBack이 호출된다', () => {
    const onBack = vi.fn();
    renderHook(() => useBackAction(true, onBack));
    window.dispatchEvent(new MouseEvent('mouseup', { button: 3 }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('일반 클릭(button 0)으로는 onBack이 호출되지 않는다', () => {
    const onBack = vi.fn();
    renderHook(() => useBackAction(true, onBack));
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('active가 false로 바뀌면 리스너가 제거된다', () => {
    const onBack = vi.fn();
    const { rerender } = renderHook(({ active }) => useBackAction(active, onBack), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('여러 레이어가 활성화되면 가장 최근 것만 호출된다 (stack 동작)', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const { unmount: unmountInner } = renderHook(() => useBackAction(true, inner));
    const { unmount: unmountOuter } = renderHook(() => useBackAction(true, outer));
    // renderHook 순서 상관없이 마지막에 push된 것이 top
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    // top이 호출된 쪽만 한 번 호출됨 (렌더 순서 = push 순서 = outer가 top)
    const topCalled = outer.mock.calls.length + inner.mock.calls.length;
    expect(topCalled).toBe(1);
    unmountOuter();
    // outer가 빠지면 inner가 새 top
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(inner).toHaveBeenCalledTimes(1);
    unmountInner();
  });
});
