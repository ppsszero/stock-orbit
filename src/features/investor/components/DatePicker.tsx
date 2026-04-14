/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { memo, useState, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { sem } from '@/shared/styles/semantic';
import { spacing, fontSize, fontWeight, radius, transition, zIndex, shadow } from '@/shared/styles/tokens';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const toDate = (s: string) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
const toStr = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export const DatePicker = memo(({ dateStr, minDate, maxDate, onSelect, onClose }: {
  dateStr: string; minDate: string; maxDate: string;
  onSelect: (d: string) => void; onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, true, onClose);

  const current = toDate(dateStr);
  const [viewYear, setViewYear] = useState(current.getFullYear());
  const [viewMonth, setViewMonth] = useState(current.getMonth());

  const minD = toDate(minDate);
  const maxD = toDate(maxDate);

  const canPrevMonth = new Date(viewYear, viewMonth, 1) > new Date(minD.getFullYear(), minD.getMonth(), 1);
  const canNextMonth = new Date(viewYear, viewMonth, 1) < new Date(maxD.getFullYear(), maxD.getMonth(), 1);

  const prevMonth = () => {
    if (!canPrevMonth) return;
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (!canNextMonth) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleSelect = (day: number) => {
    const str = toStr(new Date(viewYear, viewMonth, day));
    if (str >= minDate && str <= maxDate) {
      onSelect(str);
      onClose();
    }
  };

  return (
    <div ref={ref} css={dp.wrap}>
      <div css={dp.header}>
        <button css={dp.arrow} onClick={prevMonth} disabled={!canPrevMonth}><FiChevronLeft size={14} /></button>
        <span css={dp.title}>{viewYear}년 {viewMonth + 1}월</span>
        <button css={dp.arrow} onClick={nextMonth} disabled={!canNextMonth}><FiChevronRight size={14} /></button>
      </div>

      <div css={dp.grid}>
        {WEEKDAYS.map(w => <span key={w} css={dp.weekday}>{w}</span>)}
      </div>

      <div css={dp.grid}>
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const str = toStr(new Date(viewYear, viewMonth, day));
          const isSelected = str === dateStr;
          const isToday = str === toStr(new Date());
          const inRange = str >= minDate && str <= maxDate;
          return (
            <button
              key={day}
              css={dp.day(isSelected, isToday, inRange)}
              disabled={!inRange}
              onClick={() => handleSelect(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const dp = {
  wrap: css`
    position: absolute; top: 36px; left: 50%; transform: translateX(-50%);
    z-index: ${zIndex.dropdown};
    background: ${sem.surface.card}; border: 1px solid ${sem.border.default};
    border-radius: ${radius.xl}px; padding: ${spacing.lg}px;
    box-shadow: ${shadow.lg};
    width: 260px;
    font-family: inherit;
    & button { font-family: inherit; }
  `,
  header: css`
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: ${spacing.md}px;
  `,
  arrow: css`
    width: ${spacing['3xl']}px; height: ${spacing['3xl']}px; border: none; background: transparent;
    color: ${sem.text.secondary}; cursor: pointer; display: flex;
    align-items: center; justify-content: center; border-radius: ${radius.sm}px;
    &:hover:not(:disabled) { background: ${sem.bg.surface}; }
    &:disabled { opacity: 0.3; cursor: default; }
  `,
  title: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};`,
  grid: css`display: grid; grid-template-columns: repeat(7, 1fr); gap: ${spacing.xs}px;`,
  weekday: css`
    font-size: ${fontSize.xs}px; color: ${sem.text.tertiary}; font-weight: ${fontWeight.bold};
    text-align: center; padding: ${spacing.sm}px 0;
  `,
  day: (selected: boolean, today: boolean, inRange: boolean) => css`
    width: ${spacing['4xl']}px; height: ${spacing['4xl']}px; border: none; border-radius: ${radius.md}px;
    font-size: ${fontSize.sm}px; font-weight: ${selected ? fontWeight.bold : fontWeight.medium};
    cursor: ${inRange ? 'pointer' : 'default'};
    display: flex; align-items: center; justify-content: center;
    background: ${selected ? sem.action.primary : 'transparent'};
    color: ${selected ? sem.text.inverse : !inRange ? sem.text.disabled : today ? sem.action.primary : sem.text.primary};
    ${today && !selected ? `outline: 1px solid ${sem.action.primary}; outline-offset: -1px;` : ''}
    transition: background ${transition.fast};
    &:hover:not(:disabled) { background: ${selected ? sem.action.primary : sem.bg.surface}; }
  `,
};
