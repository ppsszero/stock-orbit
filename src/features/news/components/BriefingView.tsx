/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { FiExternalLink } from 'react-icons/fi';

import { spacing, fontSize, fontWeight, radius, letterSpacing } from '@/shared/styles/tokens';
import { MarketBriefing, getNewsUrl } from '@/shared/naver';
import { parseDetail } from '../utils/parseDetail';
import { sem } from '@/shared/styles/semantic';

interface Props {
  briefing: MarketBriefing;

  onLinkClick: (url: string) => void;
}

export const BriefingView = ({ briefing: b, onLinkClick }: Props) => {
  const sections = parseDetail(b.detail);
  return (
    <div css={s.wrap}>
      <div css={s.topRow}>
        <div css={s.badge}><span css={s.dot} />AI 마켓 브리핑</div>
        <span css={s.date}>{b.briefingDate} {b.briefingHour}시</span>
      </div>

      <h3 css={s.title}>{b.title}</h3>
      <p css={s.summary}>{b.summary}</p>
      <div css={s.divider} />

      {sections.map((sec, i) => (
        <div key={i} css={s.block}>
          {sec.heading && <h4 css={s.heading}>{sec.heading}</h4>}
          <p css={s.body}>{sec.body}</p>
        </div>
      ))}

      {b.articles.length > 0 && (
        <>
          <div css={s.divider} />
          <div css={s.relatedHeader}>관련 뉴스</div>
          {b.articles.map(a => (
            <div key={a.articleId} css={s.link} onClick={() => onLinkClick(getNewsUrl(a.officeId, a.articleId))}>
              <span css={s.linkTitle}>{a.title}</span>
              <span css={s.linkOffice}>{a.officeName} <FiExternalLink size={9} /></span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

const aiPulse = keyframes`0%,100%{opacity:1}50%{opacity:0.4}`;
const s = {
  wrap: css`padding:${spacing.xl}px ${spacing.xl}px ${spacing['3xl']}px;`,
  topRow: css`display:flex;align-items:center;justify-content:space-between;margin-bottom:${spacing.lg + 2}px;`,
  badge: css`
    display:inline-flex;align-items:center;gap:${spacing.sm}px;
    padding:${spacing.sm}px ${spacing.md + 2}px;border-radius:${spacing['2xl']}px;
    background:linear-gradient(135deg, #4593FC, #7B61FF);
    color:#fff;font-size:${fontSize.xs}px;font-weight:${fontWeight.bold};letter-spacing:${letterSpacing.wide}px;
  `,
  dot: css`width:5px;height:5px;border-radius:50%;background:#00E676;box-shadow:0 0 6px #00E676;animation:${aiPulse} 2s ease infinite;`,
  date: css`font-size:${fontSize.sm}px;color:${sem.text.tertiary};`,
  title: css`font-size:${fontSize['2xl']}px;font-weight:${fontWeight.extrabold};color:${sem.text.primary};margin:0 0 ${spacing.lg}px;line-height:1.5;letter-spacing:${letterSpacing.tight}px;`,
  summary: css`font-size:${fontSize.lg}px;color:${sem.text.secondary};line-height:1.9;letter-spacing:0.1px;margin:0;word-break:keep-all;`,
  divider: css`height:1px;background:${sem.border.strong};margin:${spacing['2xl']}px 0;`,
  block: css`margin-bottom:${spacing['2xl']}px;&:last-of-type{margin-bottom:0;}`,
  heading: css`font-size:${fontSize.xl}px;font-weight:${fontWeight.bold};color:${sem.text.primary};margin:0 0 ${spacing.md - 2}px;line-height:1.5;`,
  body: css`font-size:${fontSize.lg}px;color:${sem.text.secondary};line-height:1.9;letter-spacing:0.1px;word-break:keep-all;margin:0;`,
  relatedHeader: css`font-size:${fontSize.base}px;font-weight:${fontWeight.bold};color:${sem.text.tertiary};margin-bottom:${spacing.md}px;letter-spacing:${letterSpacing.wide}px;`,
  link: css`
    display:flex;flex-direction:column;gap:${spacing.sm}px;
    padding:${spacing.md + 2}px ${spacing.lg}px;cursor:pointer;
    margin-bottom:${spacing.sm}px;border-radius:${radius.lg}px;
    background:${sem.bg.surface};&:hover{background:${sem.bg.elevated};}
  `,
  linkTitle: css`font-size:${fontSize.md}px;font-weight:${fontWeight.semibold};color:${sem.text.primary};line-height:1.4;`,
  linkOffice: css`font-size:${fontSize.xs}px;color:${sem.text.tertiary};display:flex;align-items:center;gap:${spacing.xs}px;`,
};
