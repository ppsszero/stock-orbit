/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FiSearch, FiSettings, FiActivity, FiTrendingUp, FiFileText } from 'react-icons/fi';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useToast } from '@/shared/ui/Toast';
import { fmtTime } from '@/shared/utils/format';
import { spacing, fontSize, radius, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  lastUpdated: Date | null;
  loading: boolean;
  /** 표시할 종목이 있는지 — 없으면 갱신 시각 대신 "종목 없음" 표시 */
  hasSymbols: boolean;
  onSearch: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  onInvestor: () => void;
  onRanking: () => void;
  onNews: () => void;
}

/**
 * 하단 상태 바 — Dumb Component.
 * memo 적용으로 props 변경 없으면 리렌더 방지.
 * CSS 변수 기반 스타일링 (런타임 CSS 생성 제거).
 */
export const StatusBar = memo(({ lastUpdated, loading, hasSymbols, onSearch, onSettings, onRefresh, onInvestor, onRanking, onNews }: Props) => {
  const toast = useToast();
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(lastUpdated);

  useEffect(() => {
    if (lastUpdated && lastUpdated !== prevRef.current) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1200);
      prevRef.current = lastUpdated;
      return () => clearTimeout(id);
    }
  }, [lastUpdated]);

  const handleRefresh = useCallback(() => {
    if (!hasSymbols) {
      toast.show('갱신할 종목이 없어요', 'info');
      return;
    }
    onRefresh();
    toast.show('데이터를 갱신했어요.');
  }, [onRefresh, toast, hasSymbols]);

  // 갱신 시각 표시 텍스트 — 상태별로 명확한 한글 문구 사용
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
          <button css={s.ctrlBtn} onClick={onInvestor} aria-label="투자정보"><FiActivity size={13} /></button>
        </Tooltip>
        <span css={s.divider} />
        <Tooltip content="뉴스" position="top" display="inline-flex">
          <button css={s.ctrlBtn} onClick={onNews} aria-label="뉴스"><FiFileText size={13} /></button>
        </Tooltip>
        <span css={s.divider} />
        <Tooltip content={hasSymbols ? '데이터 갱신' : '종목을 먼저 추가해주세요'} position="top" display="inline-flex">
          <button css={s.updateInfo} onClick={handleRefresh} aria-label="데이터 갱신">
            <span css={[s.dot, hasSymbols && flash && s.dotFlash, hasSymbols && loading && s.dotLoading]} />
            <span css={s.time}>{statusText}</span>
          </button>
        </Tooltip>
        <Tooltip content="설정" position="top" display="inline-flex">
          <button css={s.ctrlBtn} onClick={onSettings} aria-label="설정"><FiSettings size={13} /></button>
        </Tooltip>
      </div>
    </div>
  );
});

const pulse = keyframes`0%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.8)}100%{opacity:1;transform:scale(1)}`;
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
  divider: css`width: 1px; height: ${spacing.lg}px; background: ${sem.border.default}; flex-shrink: 0;`,
  updateInfo: css`display: flex; align-items: center; gap: ${spacing.sm}px; padding: 0 ${spacing.md}px; cursor: pointer; border: none; background: transparent;`,
  dot: css`width: 5px; height: 5px; border-radius: 50%; background: ${sem.text.tertiary}; transition: background 0.3s; flex-shrink: 0;`,
  dotFlash: css`background: ${sem.action.success}; animation: ${pulse} 1.2s ease;`,
  dotLoading: css`background: ${sem.action.warning}; animation: ${pulse} 0.8s ease infinite;`,
  time: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary}; white-space: nowrap; font-variant-numeric: tabular-nums;`,
};
