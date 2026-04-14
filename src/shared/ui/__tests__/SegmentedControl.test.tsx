/** @jsxImportSource @emotion/react */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from '../SegmentedControl';

const items = [
  { key: 'list', label: '리스트' },
  { key: 'grid', label: '그리드' },
  { key: 'tile', label: '타일' },
];

describe('SegmentedControl', () => {
  it('모든 옵션을 렌더링한다', () => {
    render(<SegmentedControl items={items} value="list" onChange={vi.fn()} />);
    expect(screen.getByText('리스트')).toBeInTheDocument();
    expect(screen.getByText('그리드')).toBeInTheDocument();
    expect(screen.getByText('타일')).toBeInTheDocument();
  });

  it('활성 탭에 aria-selected="true"가 적용된다', () => {
    render(<SegmentedControl items={items} value="grid" onChange={vi.fn()} />);
    expect(screen.getByText('그리드')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('리스트')).toHaveAttribute('aria-selected', 'false');
  });

  it('탭 클릭 시 onChange가 해당 key로 호출된다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl items={items} value="list" onChange={onChange} />);
    await user.click(screen.getByText('타일'));
    expect(onChange).toHaveBeenCalledWith('tile');
  });

  it('role="tablist"과 role="tab"이 존재한다', () => {
    render(<SegmentedControl items={items} value="list" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
