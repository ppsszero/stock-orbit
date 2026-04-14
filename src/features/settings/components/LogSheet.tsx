/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiTrash2, FiCopy } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { LogEntry, LogLevel } from '@/shared/utils/logger';
import { SheetLayout, SegmentedControl } from '@/shared/ui';
import { useLogSheet, FilterKey } from '../hooks/useLogSheet';
import { sem } from '@/shared/styles/semantic';

interface Props { open: boolean; onClose: () => void; }

const LEVEL_STYLE: Record<LogLevel, { color: string; label: string }> = {
  info: { color: sem.action.primary, label: 'INFO' },
  warn: { color: sem.action.warning, label: 'WARN' },
  error: { color: sem.action.danger, label: 'ERR' },
  api: { color: sem.action.success, label: 'API' },
};

const FILTERS = [
  { key: 'all' as FilterKey, label: 'ALL' },
  { key: 'info' as FilterKey, label: 'INFO' },
  { key: 'warn' as FilterKey, label: 'WARN' },
  { key: 'error' as FilterKey, label: 'ERR' },
  { key: 'api' as FilterKey, label: 'API' },
];

/**
 * 시스템 로그 시트 컴포넌트.
 *
 * 변경 사항:
 * - 로그 구독, 필터링, 무한스크롤, 클립보드 복사 로직 → useLogSheet 훅으로 분리
 * - 컴포넌트는 UI 렌더링만 담당
 */
export const LogSheet = ({ open, onClose }: Props) => {
  const { filter, setFilter, filtered, visible, listRef, copyLog, handleScroll, clearLogs } = useLogSheet(open);

  const navRight = (
    <>
      <span css={st.count}>{filtered.length}건</span>
      <button css={st.clearBtn} onClick={clearLogs}>
        <FiTrash2 size={13} />
      </button>
    </>
  );

  return (
    <SheetLayout open={open} title="시스템 로그" onClose={onClose} navRight={navRight}>
      <div css={st.filterWrap}>
        <SegmentedControl items={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <div css={st.logList} ref={listRef} onScroll={handleScroll}>
        {filtered.length === 0 && <div css={st.empty}>로그가 없습니다</div>}
        {visible.map(log => (
          <LogRow key={log.id} log={log} onClick={() => copyLog(log)} />
        ))}
      </div>
    </SheetLayout>
  );
};

/* --- Dumb sub-components --- */

const LogRow = ({ log, onClick }: { log: LogEntry; onClick: () => void }) => {
  const ls = LEVEL_STYLE[log.level];
  return (
    <div css={st.logRow} onClick={onClick}>
      <div css={st.logHeader}>
        <span css={st.levelBadge(ls.color)}>{ls.label}</span>
        <span css={st.timestamp}>
          {log.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <FiCopy size={10} css={st.copyIcon} />
      </div>
      <div css={st.logMsg}>{log.message}</div>
      {log.detail && <div css={st.logDetail}>{log.detail}</div>}
    </div>
  );
};

/* --- Styles (only unique to LogSheet) --- */
const st = {
  count: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary};`,
  clearBtn: css`
    border: none; background: transparent; border-radius: ${radius.md}px;
    padding: ${spacing.md}px ${spacing.md}px;
    font-size: ${fontSize.sm}px; color: ${sem.text.secondary}; cursor: pointer;
    display: flex; align-items: center; gap: ${spacing.sm}px;
    -webkit-app-region: no-drag;
    transition: color ${transition.fast};
    &:hover { color: ${sem.action.danger}; }
  `,
  filterWrap: css`padding: ${spacing.md}px ${spacing.lg}px; flex-shrink: 0;`,
  logList: css`flex: 1; overflow-y: auto; font-family: 'Cascadia Code', 'Fira Code', 'SF Mono', monospace;`,
  empty: css`padding: ${spacing['4xl']}px; text-align: center; font-size: ${fontSize.base}px; color: ${sem.text.tertiary};`,
  logRow: css`
    padding: ${spacing.md}px ${spacing.xl}px; border-bottom: 1px solid ${sem.border.subtle}; cursor: pointer;
    transition: background 0.1s;
    &:hover { background: ${sem.bg.surface}; }
    &:active { background: ${sem.bg.elevated}; }
  `,
  logHeader: css`display: flex; align-items: center; gap: ${spacing.md}px; margin-bottom: ${spacing.xs}px;`,
  levelBadge: (color: string) => css`
    font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold}; padding: 1px 5px; border-radius: ${radius.xs}px;
    background: ${color}18; color: ${color}; font-family: monospace;
  `,
  timestamp: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  copyIcon: css`color: ${sem.text.tertiary}; opacity: 0; margin-left: auto; transition: opacity ${transition.fast}; *:hover > & { opacity: 0.6; }`,
  logMsg: css`font-size: ${fontSize.md}px; color: ${sem.text.primary}; line-height: 1.4;`,
  logDetail: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; margin-top: ${spacing.xs}px; word-break: break-all;`,
};
