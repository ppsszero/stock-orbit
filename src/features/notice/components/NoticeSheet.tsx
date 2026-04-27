/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useEffect, useCallback } from 'react';
import { spacing, fontSize, fontWeight, transition } from '@/shared/styles/tokens';
import { SheetLayout, TimelineRow, WebViewPanel } from '@/shared/ui';
import { useToast } from '@/shared/ui/Toast';
import { NoticeItem } from '@/shared/types';
import { sem } from '@/shared/styles/semantic';

interface Props {
  open: boolean;
  notices: NoticeItem[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<boolean> | void;
}

/** 특정 버전의 릴리즈 노트 GitHub 페이지 URL */
const releaseUrl = (version: string) => `https://github.com/ppsszero/stock-orbit/releases/tag/v${version}`;

export const NoticeSheet = ({ open, notices, loading, onClose, onRefresh }: Props) => {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState<string>('');
  const toast = useToast();

  // 시트가 닫히면 웹뷰도 초기화 (NewsSheet와 동일 패턴)
  useEffect(() => { if (!open) setViewUrl(null); }, [open]);

  const handleItemClick = (n: NoticeItem) => {
    setViewUrl(releaseUrl(n.version));
    setViewTitle(`v${n.version} 릴리즈 노트`);
  };

  const handleRefresh = useCallback(async () => {
    const ok = await Promise.resolve(onRefresh());
    toast.refreshResult(ok !== false, '공지사항');
  }, [onRefresh, toast]);

  return (
    <SheetLayout open={open} title="공지사항" onClose={onClose} onRefresh={handleRefresh} refreshing={loading}>
      <div css={s.list}>
        {notices.length === 0 ? (
          <div css={s.empty}>공지사항이 없습니다</div>
        ) : (
          notices.map((n, i) => {
            const isLatest = i === 0;
            const dotStyle = css`
              background: ${isLatest ? sem.action.primary : sem.feedback.flat};
              ${isLatest ? `box-shadow: 0 0 0 3px ${sem.action.primary}25;` : ''}
            `;

            return (
              <TimelineRow key={n.version} dotStyle={dotStyle} isLast={i === notices.length - 1}>
                <button
                  type="button"
                  css={s.itemBtn}
                  onClick={() => handleItemClick(n)}
                  aria-label={`v${n.version} 릴리즈 노트 보기`}
                >
                  <div css={s.header}>
                    <span css={s.version(isLatest)}>v{n.version}</span>
                    <span css={s.date}>{n.date}</span>
                  </div>
                  <p css={s.content} className="notice-content">{n.content}</p>
                </button>
              </TimelineRow>
            );
          })
        )}
      </div>

      <WebViewPanel url={viewUrl} title={viewTitle} onClose={() => setViewUrl(null)} />
    </SheetLayout>
  );
};

const s = {
  list: css`
    flex: 1; overflow-y: auto;
    padding: ${spacing.xl}px;
  `,
  empty: css`padding:${spacing['5xl']}px;text-align:center;color:${sem.text.tertiary};font-size:${fontSize.base}px;`,
  itemBtn: css`
    display: block; width: 100%; text-align: left;
    background: transparent; border: none; padding: 0;
    cursor: pointer; color: inherit; font: inherit;
    &:hover .notice-content { text-decoration: underline; text-underline-offset: 3px; }
  `,
  header: css`
    display: flex; align-items: center; gap: ${spacing.md}px;
  `,
  version: (isLatest: boolean) => css`
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold};
    color: ${isLatest ? sem.action.primary : sem.text.secondary};
  `,
  date: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary};`,
  content: css`
    font-size: ${fontSize.base}px; color: ${sem.text.primary};
    line-height: 1.6; margin: 0; white-space: pre-line;
  `,
};
