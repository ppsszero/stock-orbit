import { useState, useEffect, useCallback, useRef } from 'react';
import { logger, LogEntry, LogLevel } from '@/shared/utils/logger';
import { useToast } from '@/shared/ui/Toast';

export type FilterKey = LogLevel | 'all';

/**
 * LogSheet의 상태 관리 및 side effect를 담당하는 훅.
 *
 * 분리 이유:
 * - LogSheet 컴포넌트에 로그 구독, 필터링, 무한스크롤, 클립보드 복사 로직이 혼재
 * - 컴포넌트는 UI 렌더링만, 훅은 상태/효과만 담당하도록 분리
 */
export const useLogSheet = (open: boolean) => {
  const [logs, setLogs] = useState<LogEntry[]>(logger.getLogs());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [visibleCount, setVisibleCount] = useState(50);
  const listRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // 로그 구독
  useEffect(() => logger.subscribe(() => setLogs([...logger.getLogs()])), []);

  // 시트 열릴 때 visible count 초기화
  useEffect(() => { if (open) setVisibleCount(50); }, [open]);

  const copyLog = useCallback(async (log: LogEntry) => {
    const text = `[${log.level.toUpperCase()}] ${log.timestamp.toLocaleTimeString()} ${log.message}${log.detail ? '\n' + log.detail : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.show('로그를 복사했어요.', 'copy');
    } catch {
      toast.show('복사에 실패했어요.', 'error');
    }
  }, [toast]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => prev + 50);
    }
  }, []);

  const clearLogs = useCallback(() => logger.clear(), []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);
  const visible = filtered.slice(0, visibleCount);

  return {
    filter,
    setFilter,
    filtered,
    visible,
    listRef,
    copyLog,
    handleScroll,
    clearLogs,
  };
};
