import { useState, useEffect, useCallback } from 'react';
import { NoticeItem } from '@/shared/types';
import { withMinSpin } from '@/shared/utils/withMinSpin';

const NOTICE_GIST_URL = 'https://gist.githubusercontent.com/ppsszero/01b338c3e822b3804411cdda5f9b1a3a/raw/stock-orbit-notice.json';
const STORAGE_KEY = 'lastSeenNoticeVersion';

const fetchNotices = async (): Promise<NoticeItem[]> => {
  try {
    const res = await fetch(NOTICE_GIST_URL);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
};

/**
 * 공지사항 fetch + 새 공지 뱃지 관리.
 * gist raw URL에서 직접 fetch (CORS 허용, IPC 불필요).
 * 최신 버전과 localStorage의 마지막 확인 버전을 비교하여 뱃지 표시.
 */
export const useNoticeData = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [hasNew, setHasNew] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await fetchNotices();
      if (data.length === 0) return;
      setNotices(data);
      const lastSeen = localStorage.getItem(STORAGE_KEY) || '';
      if (data[0].version !== lastSeen) setHasNew(true);
    };
    load();
  }, []);

  const markSeen = useCallback(() => {
    if (notices.length > 0) {
      localStorage.setItem(STORAGE_KEY, notices[0].version);
      setHasNew(false);
    }
  }, [notices]);

  const refresh = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    // 캐시 히트 등으로 즉시 반환되어도 사용자가 갱신 인지하도록 최소 표시 시간 보장
    const data = await withMinSpin(fetchNotices);
    if (data.length > 0) setNotices(data);
    setLoading(false);
    return data.length > 0;
  }, []);

  return { notices, hasNew, loading, markSeen, refresh };
};
