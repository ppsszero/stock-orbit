/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('체크된 상태로 렌더링된다', () => {
    render(<Toggle checked={true} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('체크되지 않은 상태로 렌더링된다', () => {
    render(<Toggle checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('클릭하면 onChange가 반대 값으로 호출된다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('label이 aria-label로 적용된다', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="항상 위" />);
    expect(screen.getByRole('checkbox', { name: '항상 위' })).toBeInTheDocument();
  });
});
