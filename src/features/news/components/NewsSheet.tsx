/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useEffect, useCallback } from 'react';

import { spacing } from '@/shared/styles/tokens';
import { SheetLayout, SegmentedControl, WebViewPanel, LoadingCenter } from '@/shared/ui';
import { useToast } from '@/shared/ui/Toast';
import { useNewsData } from '../hooks/useNewsData';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { BriefingView } from './BriefingView';
import { NewsList } from './NewsList';
import { StoryList } from './StoryList';
import { sem } from '@/shared/styles/semantic';

interface Props { open: boolean; onClose: () => void; }

type Tab = 'briefing' | 'news' | 'story';
const TABS: { key: Tab; label: string }[] = [
  { key: 'briefing', label: 'AI 브리핑' },
  { key: 'news', label: '메인뉴스' },
  { key: 'story', label: '머니스토리' },
];

// NOTE: orchestration만 담당.
// 데이터 → useNewsData, 스크롤 감지 → useInfiniteScroll, UI → 각 리스트 컴포넌트.
export const NewsSheet = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState<Tab>('briefing');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const toast = useToast();
  const {
    briefing, news, stories, loading, refresh,
    loadMoreNews, loadMoreStories, newsMaxed, storiesMaxed,
  } = useNewsData(open);

  const handleRefresh = useCallback(async () => {
    const ok = await refresh();
    if (ok) toast.show('뉴스를 새로 불러왔어요', 'success');
    else toast.show('뉴스를 불러오지 못했어요', 'error');
  }, [refresh, toast]);

  // 스크롤 감지는 실제 스크롤 컨테이너(tabBody)에 부착
  const newsScrollRef = useInfiniteScroll(loadMoreNews, !newsMaxed);
  const storyScrollRef = useInfiniteScroll(loadMoreStories, !storiesMaxed);

  useEffect(() => { if (open) setViewUrl(null); }, [open]);

  if (!open) return null;

  return (
    <SheetLayout open={open} title="뉴스" onClose={onClose} onRefresh={handleRefresh} refreshing={loading}>
      <div css={s.tabWrap}>
        <SegmentedControl items={TABS} value={tab} onChange={setTab} />
      </div>

      {loading ? (
        <div css={s.body}><LoadingCenter /></div>
      ) : (
        <>
          <div css={s.tabBody(tab === 'briefing')}>
            {briefing
              ? <BriefingView briefing={briefing} onLinkClick={setViewUrl} />
              : <div css={s.empty}>브리핑이 없습니다</div>
            }
          </div>

          <div ref={newsScrollRef} css={s.tabBody(tab === 'news')}>
            <NewsList items={news} maxed={newsMaxed} onLinkClick={setViewUrl} />
          </div>

          <div ref={storyScrollRef} css={s.tabBody(tab === 'story')}>
            <StoryList items={stories} maxed={storiesMaxed} onLinkClick={setViewUrl} />
          </div>
        </>
      )}

      <WebViewPanel url={viewUrl} title="뉴스" onClose={() => setViewUrl(null)} />
    </SheetLayout>
  );
};

const s = {
  tabWrap: css`padding:${spacing.md + 2}px ${spacing.xl}px ${spacing.md - 2}px;flex-shrink:0;`,
  body: css`flex:1;overflow-y:auto;`,
  tabBody: (visible: boolean) => css`flex:1;overflow-y:auto;display:${visible ? 'block' : 'none'};`,
  empty: css`padding:${spacing['5xl']}px;text-align:center;color:${sem.text.tertiary};`,
};
