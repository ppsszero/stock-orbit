import { renderHook } from '@testing-library/react';
import { useOutsideClick } from '../useOutsideClick';

describe('useOutsideClick', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('요소 외부 클릭 시 onOutside가 호출된다', () => {
    const onOutside = vi.fn();
    const ref = { current: container };
    renderHook(() => useOutsideClick(ref, true, onOutside));
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('요소 내부 클릭 시 onOutside가 호출되지 않는다', () => {
    const onOutside = vi.fn();
    const ref = { current: container };
    renderHook(() => useOutsideClick(ref, true, onOutside));
    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('active가 false이면 외부 클릭해도 호출되지 않는다', () => {
    const onOutside = vi.fn();
    const ref = { current: container };
    renderHook(() => useOutsideClick(ref, false, onOutside));
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('active가 true→false로 바뀌면 리스너가 제거된다', () => {
    const onOutside = vi.fn();
    const ref = { current: container };
    const { rerender } = renderHook(({ active }) => useOutsideClick(ref, active, onOutside), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onOutside).not.toHaveBeenCalled();
  });
});
