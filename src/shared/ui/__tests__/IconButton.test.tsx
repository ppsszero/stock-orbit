/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiX, FiSearch, FiSettings } from 'react-icons/fi';
import { IconButton } from '../IconButton';

// useTheme은 Zustand store를 읽으므로 mock 처리
vi.mock('../../../store/selectors', () => ({
  useTheme: () => ({ border: '#333333', accent: '#4D9EFF' }),
}));

describe('IconButton', () => {
  it('아이콘을 렌더링한다', () => {
    render(<IconButton icon={<FiX data-testid="icon" />} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('클릭 시 onClick 핸들러를 호출한다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon={<FiSearch />} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ariaLabel이 button의 accessible name이 된다', () => {
    render(<IconButton icon={<FiSettings />} ariaLabel="설정 열기" />);
    expect(screen.getByRole('button', { name: '설정 열기' })).toBeInTheDocument();
  });

  it('ariaLabel이 없어도 button 역할로 렌더링된다', () => {
    render(<IconButton icon={<FiX />} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('onClick이 없어도 에러 없이 렌더링된다', () => {
    expect(() => render(<IconButton icon={<FiX />} />)).not.toThrow();
  });
});
