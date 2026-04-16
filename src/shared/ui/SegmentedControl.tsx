/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { fontSize, fontWeight, radius, height, shadow, transition, spacing } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Item<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  items: Item<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export const SegmentedControl = <T extends string>({
  items, value, onChange, size = 'sm',
}: Props<T>) => {
  const idx = items.findIndex(i => i.key === value);
  const total = items.length;
  const h = size === 'md' ? height.segMd : height.segSm;

  return (
    <div css={s.wrap(h, total)} role="tablist">
      <div css={s.slider(idx)} />
      {items.map((item, i) => (
        <button
          key={item.key}
          css={s.btn(item.key === value, size, i)}
          role="tab"
          aria-selected={item.key === value}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

const PAD = spacing.xs + 1; // 3px — padding용
const s = {
  wrap: (h: number, total: number) => css`
    display: grid;
    grid-template-columns: repeat(${total}, 1fr);
    height: ${h}px;
    padding: ${PAD}px;
    background: ${sem.bg.surface};
    border-radius: ${radius.lg}px;
    flex-shrink: 0;
  `,
  slider: (idx: number) => css`
    grid-row: 1;
    grid-column: 1;
    background: ${sem.surface.seg};
    border-radius: 5px;
    box-shadow: ${shadow.seg};
    transform: translateX(${idx * 100}%);
    transition: transform ${transition.smooth};
  `,
  btn: (active: boolean, size: 'sm' | 'md', col: number) => css`
    grid-row: 1;
    grid-column: ${col + 1};
    z-index: 1;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: ${size === 'md' ? fontSize.md : fontSize.sm}px;
    font-weight: ${fontWeight.bold};
    line-height: 0;
    cursor: pointer;
    padding: 0 ${spacing.md}px;
    padding-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${active ? sem.text.seg : sem.text.tertiary};
    transition: color ${transition.normal};
  `,
};
