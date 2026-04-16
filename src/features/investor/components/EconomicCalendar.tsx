/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, transition, opacity } from '@/shared/styles/tokens';
import { useEconomicCalendar } from '@/features/investor/hooks/useEconomicCalendar';
import { DatePicker } from '@/features/investor/components/DatePicker';
import { TimelineItem } from '@/features/investor/components/TimelineItem';
import { sem } from '@/shared/styles/semantic';

export const EconomicCalendar = () => {
  const {
    dateStr, displayDate, items, loading,
    isToday, canPrev, canNext,
    minDate, maxDate,
    goPrev, goNext, goToday, goTo,
  } = useEconomicCalendar();

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleDateSelect = useCallback((d: string) => {
    goTo(d);
  }, [goTo]);

  return (
    <div css={s.wrap}>
      <div css={s.nav}>
        <button css={s.navBtn} onClick={goPrev} disabled={!canPrev} aria-label="이전 날짜">
          <FiChevronLeft size={16} />
        </button>

        {/* 날짜 텍스트 클릭 → 피커 토글 */}
        <div css={s.dateArea}>
          <button css={s.dateBtn} onClick={() => setPickerOpen(v => !v)}>
            {displayDate}
          </button>
          {pickerOpen && (
            <DatePicker
              dateStr={dateStr}
              minDate={minDate}
              maxDate={maxDate}
              onSelect={handleDateSelect}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>

        <button css={s.navBtn} onClick={goNext} disabled={!canNext} aria-label="다음 날짜">
          <FiChevronRight size={16} />
        </button>
        {!isToday && (
          <button css={s.navBtn} onClick={goToday} aria-label="오늘로 이동">
            오늘
          </button>
        )}
      </div>

      <div css={s.body}>
        {loading ? (
          <div css={s.empty}>데이터를 불러오는 중...</div>
        ) : items.length === 0 ? (
          <div css={s.empty}>해당 날짜의 경제 지표가 없습니다</div>
        ) : (
          items.map((item, i) => (
            <TimelineItem
              key={`${item.name}-${item.releaseTime}-${i}`}
              item={item}
              isLast={i === items.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
};

/* ── Styles ── */

const s = {
  wrap: css`display: flex; flex-direction: column; flex: 1; min-height: 0;`,

  nav: css`
    display: flex; align-items: center; justify-content: center; gap: ${spacing.sm}px;
    padding: ${spacing.md}px ${spacing.xl}px; flex-shrink: 0;
    position: relative;
  `,
  navBtn: css`
    height: 28px; min-width: 28px; padding: 0 ${spacing.sm}px;
    border: 1px solid ${sem.border.default}; border-radius: ${radius.md}px;
    background: transparent; color: ${sem.text.secondary}; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-family: inherit; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold};
    transition: all ${transition.fast};
    &:hover:not(:disabled) { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
    &:disabled { opacity: ${opacity.disabledWeak}; cursor: default; }
  `,
  dateArea: css`
    position: relative; display: flex; align-items: center; gap: ${spacing.sm}px;
    color: ${sem.text.primary}; flex: 1; justify-content: center;
  `,
  dateBtn: css`
    background: transparent; border: none; cursor: pointer;
    font-family: inherit; font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    padding: 0; transition: opacity ${transition.fast};
    &:hover { opacity: ${opacity.muted}; }
  `,

  body: css`flex: 1; overflow-y: auto; padding: 0 ${spacing.xl}px ${spacing.xl}px;`,
  empty: css`padding: ${spacing['5xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
};
