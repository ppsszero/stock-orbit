/** @jsxImportSource @emotion/react */
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';

const TestTrigger = ({ type }: { type?: 'success' | 'error' | 'delete' }) => {
  const toast = useToast();
  return <button onClick={() => toast.show('테스트 메시지', type)}>토스트</button>;
};

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('show 호출 시 메시지가 표시된다', () => {
    render(<ToastProvider><TestTrigger /></ToastProvider>);
    fireEvent.click(screen.getByText('토스트'));
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
  });

  it('2.4초 후 자동으로 사라진다', () => {
    render(<ToastProvider><TestTrigger /></ToastProvider>);
    fireEvent.click(screen.getByText('토스트'));
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.queryByText('테스트 메시지')).not.toBeInTheDocument();
  });

  it('error 타입도 표시된다', () => {
    render(<ToastProvider><TestTrigger type="error" /></ToastProvider>);
    fireEvent.click(screen.getByText('토스트'));
    expect(screen.getByText('테스트 메시지')).toBeInTheDocument();
  });
});
