/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useCallback, useEffect } from 'react';

import { spacing } from '@/shared/styles/tokens';
import { SheetLayout, Tabs, WebViewPanel, LoadingCenter } from '@/shared/ui';
import { subTabPadStyle } from '@/shared/styles/sharedStyles';
import { useToast } from '@/shared/ui/Toast';
import { useWebViewState } from '@/shared/hooks/useWebViewState';
import { NewsCategory, ResearchCategory } from '@/shared/naver';
import { useNewsData } from '../hooks/useNewsData';
import { BriefingView } from './BriefingView';
import { NewsList } from './NewsList';
import { ResearchList } from './ResearchList';
import { StoryList } from './StoryList';
import { sem } from '@/shared/styles/semantic';

interface Props { open: boolean; onClose: () => void; }

type MainTab = 'briefing' | 'news' | 'research' | 'story';
const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'briefing', label: 'AI 브리핑' },
  { key: 'news',     label: '뉴스' },
  { key: 'research', label: '리서치' },
  { key: 'story',    label: '머니스토리' },
];

const NEWS_SUBS: { key: NewsCategory; label: string }[] = [
  { key: 'flashnews', label: '실시간 속보' },
  { key: 'mainnews',  label: '주요 뉴스' },
  { key: 'ranknews',  label: '많이 본 뉴스' },
  { key: 'worldnews', label: '해외뉴스' },
];

const RESEARCH_SUBS: { key: ResearchCategory; label: string }[] = [
  { key: 'daily',     label: '데일리' },
  { key: 'company',   label: '국내종목' },
  { key: 'industry',  label: '산업분석' },
  { key: 'invest',    label: '투자전략' },
  { key: 'economy',   label: '경제분석' },
  { key: 'debenture', label: '채권분석' },
];

const NEWS_MORE_URL: Record<NewsCategory, string> = {
  flashnews: 'https://m.stock.naver.com/investment/news/flashnews',
  mainnews:  'https://m.stock.naver.com/investment/news/mainnews',
  ranknews:  'https://m.stock.naver.com/investment/news/ranknews',
  worldnews: 'https://m.stock.naver.com/investment/news/worldnews',
};

const RESEARCH_MORE_URL: Record<ResearchCategory, string> = {
  daily:     'https://m.stock.naver.com/investment/research/daily',
  company:   'https://m.stock.naver.com/investment/research/company',
  industry:  'https://m.stock.naver.com/investment/research/industry',
  invest:    'https://m.stock.naver.com/investment/research/invest',
  economy:   'https://m.stock.naver.com/investment/research/economy',
  debenture: 'https://m.stock.naver.com/investment/research/debenture',
};

// NOTE: orchestration만 담당.
// 데이터 → useNewsData (lazy fetch), UI → 각 리스트 컴포넌트.
export const NewsSheet = ({ open, onClose }: Props) => {
  const [mainTab, setMainTab] = useState<MainTab>('briefing');
  const [newsSub, setNewsSub] = useState<NewsCategory>('flashnews');
  const [researchSub, setResearchSub] = useState<ResearchCategory>('daily');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const { view, open: openView, close: closeView } = useWebViewState(open);
  const toast = useToast();
  const {
    briefing, stories, newsByCat, researchByCat,
    loading,
    ensureNews, ensureResearch,
    refresh,
  } = useNewsData(open);

  // 활성 서브탭 데이터 보장 (초기 fetch에 포함 안 된 카테고리는 lazy load)
  useEffect(() => {
    if (mainTab === 'news') ensureNews(newsSub);
  }, [mainTab, newsSub, ensureNews]);
  useEffect(() => {
    if (mainTab === 'research') ensureResearch(researchSub);
  }, [mainTab, researchSub, ensureResearch]);

  const newsSubLabel = NEWS_SUBS.find(t => t.key === newsSub)?.label || '';
  const researchSubLabel = RESEARCH_SUBS.find(t => t.key === researchSub)?.label || '';

  // 시트 단위 통합 새로고침 — 모든 탭 데이터 일괄 갱신
  const handleRefresh = useCallback(async () => {
    const ok = await refresh();
    if (ok) setLastUpdatedAt(new Date());
    toast.refreshResult(ok, '뉴스');
  }, [refresh, toast]);

  // 시트 첫 진입 시 timestamp 기록 (loadInitial 완료 시점)
  useEffect(() => {
    if (open && !loading && !lastUpdatedAt) setLastUpdatedAt(new Date());
  }, [open, loading, lastUpdatedAt]);

  if (!open) return null;

  const newsItems = newsByCat[newsSub];
  const researchItems = researchByCat[researchSub];

  return (
    <SheetLayout open={open} title="뉴스" onClose={onClose} onRefresh={handleRefresh} refreshing={loading} lastUpdatedAt={lastUpdatedAt} noNavBorder>
      <Tabs id="news" items={MAIN_TABS} value={mainTab} onChange={setMainTab} variant="underline" itemAlign="center" />

      {loading ? (
        <div css={s.body}><LoadingCenter fill /></div>
      ) : (
        <>
          {mainTab === 'briefing' && (
            <div role="tabpanel" id="news-panel-briefing" aria-labelledby="news-tab-briefing" css={s.panel}>
              {briefing
                ? <BriefingView briefing={briefing} onLinkClick={openView} />
                : <div css={s.empty}>브리핑이 없습니다</div>
              }
            </div>
          )}

          {mainTab === 'news' && (
            <>
              <div css={subTabPadStyle}>
                <Tabs id="news-sub" items={NEWS_SUBS} value={newsSub} onChange={setNewsSub} variant="pill" size="sm" fluid />
              </div>
              <div role="tabpanel"
                id="news-panel-news"
                aria-labelledby={`news-tab-news news-sub-tab-${newsSub}`}
                css={s.panel}>
                {newsItems
                  ? <NewsList items={newsItems} moreLabel={`${newsSubLabel} 더보기`} moreUrl={NEWS_MORE_URL[newsSub]} onLinkClick={openView} />
                  : <LoadingCenter fill />
                }
              </div>
            </>
          )}

          {mainTab === 'research' && (
            <>
              <div css={subTabPadStyle}>
                <Tabs id="research-sub" items={RESEARCH_SUBS} value={researchSub} onChange={setResearchSub} variant="pill" size="sm" fluid />
              </div>
              <div role="tabpanel"
                id="news-panel-research"
                aria-labelledby={`news-tab-research research-sub-tab-${researchSub}`}
                css={s.panel}>
                {researchItems
                  ? <ResearchList items={researchItems} moreLabel={`${researchSubLabel} 더보기`} moreUrl={RESEARCH_MORE_URL[researchSub]} onLinkClick={openView} />
                  : <LoadingCenter fill />
                }
              </div>
            </>
          )}

          {mainTab === 'story' && (
            <div role="tabpanel" id="news-panel-story" aria-labelledby="news-tab-story" css={s.panel}>
              <StoryList items={stories} onLinkClick={openView} />
            </div>
          )}
        </>
      )}

      <WebViewPanel url={view?.url ?? null} title="뉴스" onClose={closeView} />
    </SheetLayout>
  );
};

const s = {
  body: css`flex:1;overflow-y:auto;display:flex;flex-direction:column;`,
  panel: css`flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;`,
  empty: css`padding:${spacing['5xl']}px;text-align:center;color:${sem.text.tertiary};`,
};
