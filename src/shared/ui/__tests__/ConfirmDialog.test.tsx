/** @jsxImportSource @emotion/react */
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from '../ConfirmDialog';

// gsap mock — 애니메이션 건너뜀
vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(),
    to: vi.fn((_el, opts) => { opts?.onComplete?.(); }),
    killTweensOf: vi.fn(),
  },
}));

const TestTrigger = ({ danger }: { danger?: boolean }) => {
  const confirm = useConfirm();
  const handleClick = async () => {
    const ok = await confirm({
      title: '삭제 확인',
      message: '정말 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '아니오',
      danger,
    });
    // 결과를 DOM에 표시하여 테스트에서 확인
    document.title = ok ? 'confirmed' : 'cancelled';
  };
  return <button onClick={handleClick}>열기</button>;
};

describe('ConfirmDialog', () => {
  it('confirm 호출 시 모달이 열린다', async () => {
    const user = userEvent.setup();
    render(<ConfirmProvider><TestTrigger /></ConfirmProvider>);
    await user.click(screen.getByText('열기'));
    expect(screen.getByText('삭제 확인')).toBeInTheDocument();
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
  });

  it('확인 버튼 클릭 시 true를 반환한다', async () => {
    const user = userEvent.setup();
    render(<ConfirmProvider><TestTrigger /></ConfirmProvider>);
    await user.click(screen.getByText('열기'));
    await user.click(screen.getByText('삭제'));
    expect(document.title).toBe('confirmed');
  });

  it('취소 버튼 클릭 시 false를 반환한다', async () => {
    const user = userEvent.setup();
    render(<ConfirmProvider><TestTrigger /></ConfirmProvider>);
    await user.click(screen.getByText('열기'));
    await user.click(screen.getByText('아니오'));
    expect(document.title).toBe('cancelled');
  });

  it('role="alertdialog"을 가진다', async () => {
    const user = userEvent.setup();
    render(<ConfirmProvider><TestTrigger /></ConfirmProvider>);
    await user.click(screen.getByText('열기'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('오버레이 클릭 시 취소된다', async () => {
    const user = userEvent.setup();
    render(<ConfirmProvider><TestTrigger /></ConfirmProvider>);
    await user.click(screen.getByText('열기'));
    // alertdialog의 부모(오버레이) 클릭
    const overlay = screen.getByRole('alertdialog').parentElement!;
    await user.click(overlay);
    expect(document.title).toBe('cancelled');
  });
});
