/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useState, useEffect, useRef, useCallback, useSyncExternalStore, memo, MutableRefObject } from 'react';
import { FiSearch, FiSettings, FiDollarSign, FiTrendingUp, FiFileText } from 'react-icons/fi';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useToast } from '@/shared/ui/Toast';
import { fmtTime } from '@/shared/utils/format';
import { spacing, fontSize, radius, transition, opacity } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  lastUpdated: Date | null;
  loading: boolean;
  fetching: boolean;
  hasSymbols: boolean;
  progressRef: MutableRefObject<number>;
  subscribeProgress: (fn: () => void) => () => void;
  onSearch: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  onInvestor: () => void;
  onRanking: () => void;
  onNews: () => void;
}

export const StatusBar = memo(({
  lastUpdated, loading, fetching, hasSymbols,
  progressRef, subscribeProgress,
  onSearch, onSettings, onRefresh, onInvestor, onRanking, onNews,
}: Props) => {
  const toast = useToast();

  // progress 구독 (향후 활용 가능)
  useSyncExternalStore(subscribeProgress, () => progressRef.current);

  // 완료 플래시 + 수동 갱신 시 토스트
  const [doneFlash, setDoneFlash] = useState(false);
  const wasFetching = useRef(false);
  const manualRefresh = useRef(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (fetching) {
      wasFetching.current = true;
    } else if (wasFetching.current) {
      wasFetching.current = false;
      setDoneFlash(true);
      if (manualRefresh.current) {
        manualRefresh.current = false;
        toast.show('데이터를 갱신했어요.');
      }
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setDoneFlash(false), 1200);
    }
    return () => clearTimeout(flashTimer.current);
  }, [fetching, toast]);

  const lastManualAt = useRef(0);
  const handleRefresh = useCallback(() => {
    if (!hasSymbols) {
      toast.show('갱신할 종목이 없어요', 'info');
      return;
    }
    if (fetching) return;
    const elapsed = Date.now() - lastManualAt.current;
    if (elapsed < 10_000) {
      const sec = Math.ceil((10_000 - elapsed) / 1000);
      toast.show(`${sec}초 뒤에 다시 시도해주세요`, 'info');
      return;
    }
    lastManualAt.current = Date.now();
    manualRefresh.current = true;
    onRefresh();
  }, [onRefresh, toast, hasSymbols, fetching]);

  const statusText = !hasSymbols
    ? '종목 없음'
    : (loading && !lastUpdated)
      ? '불러오는 중'
      : fmtTime(lastUpdated);

  return (
    <div css={s.bar}>
      <button css={s.searchPill} onClick={onSearch}>
        <FiSearch size={12} />
        <span>종목 검색</span>
      </button>

      <div css={s.controls}>
        <Tooltip content="실시간 랭킹" position="top" display="inline-flex">
          <button css={s.ctrlBtn} onClick={onRanking} aria-label="실시간 랭킹"><FiTrendingUp size={13} /></button>
        </Tooltip>
        <span css={s.divider} />
        <Tooltip content="투자정보" position="top" display="inline-flex">
          <button css={s.ctrlBtn} onClick={onInvestor} aria-label="투자정보"><FiDollarSign size={13} /></button>
        </Tooltip>
        <span css={s.divider} />
        <Tooltip content="뉴스" position="top" display="inline-flex">
          <button css={s.ctrlBtn} onClick={onNews} aria-label="뉴스"><FiFileText size={13} /></button>
        </Tooltip>
        <span css={s.divider} />
        <Tooltip content={hasSymbols ? (fetching ? '갱신 중...' : '데이터 갱신') : '종목을 먼저 추가해주세요'} position="top" display="inline-flex">
          <button
            css={[s.updateInfo, fetching && s.updateInfoDisabled]}
            onClick={handleRefresh}
            aria-label="데이터 갱신"
          >
            <span css={[
              s.dot,
              fetching && s.dotFetching,
              doneFlash && s.dotDone,
            ]} />
            <span css={s.time}>{statusText}</span>
          </button>
        </Tooltip>
        <span css={s.divider} />
        <Tooltip content="설정" position="top" display="inline-flex">
          <button css={s.ctrlBtn} onClick={onSettings} aria-label="설정"><FiSettings size={13} /></button>
        </Tooltip>
      </div>
    </div>
  );
});

const pulse = keyframes`
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: ${opacity.pulse}; transform: scale(1.6); }
  100% { opacity: 1; transform: scale(1); }
`;
const flashOut = keyframes`
  0% { background: ${sem.action.success}; box-shadow: 0 0 4px ${sem.action.success}; }
  100% { background: ${sem.feedback.flat}; box-shadow: none; }
`;

const s = {
  bar: css`
    display: flex; align-items: center; justify-content: space-between;
    height: 42px; padding: 0 ${spacing.md}px;
    background: ${sem.surface.titleBar};
    flex-shrink: 0; border-radius: 0 0 ${radius['2xl']}px ${radius['2xl']}px; gap: ${spacing.md}px;
  `,
  searchPill: css`
    display: flex; align-items: center; gap: ${spacing.md}px;
    padding: 0 ${spacing.md}px; height: 26px;
    background: ${sem.bg.surface}; border: none; border-radius: 7px;
    color: ${sem.text.tertiary}; font-size: ${fontSize.md}px;
    cursor: pointer; transition: background ${transition.fast};
    white-space: nowrap; flex-shrink: 0;
    &:hover { background: ${sem.bg.elevated}; }
  `,
  controls: css`
    display: flex; align-items: center; gap: ${spacing.xs}px;
    padding: 0 ${spacing.sm}px; height: 26px;
    background: ${sem.bg.surface}; border-radius: 7px; flex-shrink: 0;
  `,
  ctrlBtn: css`
    width: 26px; height: 22px; border: none; background: transparent; border-radius: 5px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: ${sem.text.tertiary}; transition: all ${transition.fast};
    &:hover { background: ${sem.bg.elevated}; color: ${sem.text.secondary}; }
  `,
  divider: css`width: 1px; height: ${spacing.lg}px; background: ${sem.border.muted}; flex-shrink: 0;`,
  updateInfo: css`
    display: flex; align-items: center; gap: ${spacing.sm + 2}px;
    padding: 0 ${spacing.md}px; cursor: pointer; border: none; background: transparent;
  `,
  updateInfoDisabled: css`cursor: default;`,
  dot: css`
    width: 5px; height: 5px; border-radius: 50%;
    background: ${sem.feedback.flat}; flex-shrink: 0;
    transition: background 0.3s;
  `,
  dotFetching: css`
    background: ${sem.action.primary};
    animation: ${pulse} 0.8s ease infinite;
  `,
  dotDone: css`animation: ${flashOut} 1.2s ease forwards;`,
  time: css`
    font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};
    white-space: nowrap; font-variant-numeric: tabular-nums;
  `,
};
