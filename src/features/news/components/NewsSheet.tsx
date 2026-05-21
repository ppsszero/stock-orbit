/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback } from 'react';

import { spacing } from '@/shared/styles/tokens';
import { SheetLayout, Tabs, WebViewPanel, LoadingCenter } from '@/shared/ui';
import { useToast } from '@/shared/ui/Toast';
import { useWebViewState } from '@/shared/hooks/useWebViewState';
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
  const { view, open: openView, close: closeView } = useWebViewState(open);
  const toast = useToast();
  const {
    briefing, news, stories, loading, refresh,
    loadMoreNews, loadMoreStories, newsMaxed, storiesMaxed,
  } = useNewsData(open);

  const handleRefresh = useCallback(async () => {
    const ok = await refresh(true);
    toast.refreshResult(ok, '뉴스');
  }, [refresh, toast]);

  // 스크롤 감지는 실제 스크롤 컨테이너(tabBody)에 부착
  const newsScrollRef = useInfiniteScroll(loadMoreNews, !newsMaxed);
  const storyScrollRef = useInfiniteScroll(loadMoreStories, !storiesMaxed);

  if (!open) return null;

  return (
    <SheetLayout open={open} title="뉴스" onClose={onClose} onRefresh={handleRefresh} refreshing={loading} noNavBorder>
      <Tabs id="news" items={TABS} value={tab} onChange={setTab} variant="underline" itemAlign="center" />

      {loading ? (
        <div css={s.body}><LoadingCenter fill /></div>
      ) : (
        <>
          <div role="tabpanel" id="news-panel-briefing" aria-labelledby="news-tab-briefing"
            hidden={tab !== 'briefing'} css={s.tabBody(tab === 'briefing')}>
            {briefing
              ? <BriefingView briefing={briefing} onLinkClick={openView} />
              : <div css={s.empty}>브리핑이 없습니다</div>
            }
          </div>

          <div role="tabpanel" id="news-panel-news" aria-labelledby="news-tab-news"
            hidden={tab !== 'news'} ref={newsScrollRef} css={s.tabBody(tab === 'news')}>
            <NewsList items={news} maxed={newsMaxed} onLinkClick={openView} />
          </div>

          <div role="tabpanel" id="news-panel-story" aria-labelledby="news-tab-story"
            hidden={tab !== 'story'} ref={storyScrollRef} css={s.tabBody(tab === 'story')}>
            <StoryList items={stories} maxed={storiesMaxed} onLinkClick={openView} />
          </div>
        </>
      )}

      <WebViewPanel url={view?.url ?? null} title="뉴스" onClose={closeView} />
    </SheetLayout>
  );
};

const s = {
  body: css`flex:1;overflow-y:auto;display:flex;flex-direction:column;`,
  tabBody: (visible: boolean) => css`flex:1;overflow-y:auto;display:${visible ? 'block' : 'none'};`,
  empty: css`padding:${spacing['5xl']}px;text-align:center;color:${sem.text.tertiary};`,
};
