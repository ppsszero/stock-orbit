/** @jsxImportSource @emotion/react */
import { css, SerializedStyles } from '@emotion/react';
import { ReactNode } from 'react';
import { spacing , sp } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  /** dot 스타일 (색상, 테두리 등 커스터마이징) */
  dotStyle?: SerializedStyles;
  /** 마지막 아이템이면 line 숨김 */
  isLast: boolean;
  /** body 영역에 들어갈 콘텐츠 */
  children: ReactNode;
}

const DOT_SIZE = 10;
const TRACK_W = 14;

/**
 * 타임라인 레이아웃 컴포넌트.
 * 좌측 track(dot + line) + 우측 body(children)로 구성.
 * 경제 캘린더, 공지사항 등 타임라인 형태 UI에서 재사용.
 */
export const TimelineRow = ({ dotStyle, isLast, children }: Props) => (
  <div css={s.row}>
    <div css={s.track}>
      <div css={[s.dot, dotStyle]} />
      {!isLast && <div css={s.line} />}
    </div>
    <div css={s.body}>
      {children}
    </div>
  </div>
);

const s = {
  row: css`display: flex; gap: ${spacing.md}px;`,
  track: css`
    display: flex; flex-direction: column; align-items: center;
    width: ${TRACK_W}px; flex-shrink: 0; padding-top: ${spacing.xs}px;
  `,
  dot: css`
    width: ${DOT_SIZE}px; height: ${DOT_SIZE}px;
    border-radius: 50%; flex-shrink: 0;
  `,
  line: css`width: 1px; flex: 1; background: ${sem.border.default}; margin: ${spacing.sm}px 0;`,
  body: css`
    flex: 1; min-width: 0;
    padding: ${spacing.sm}px 0 ${spacing['3xl']}px;
    display: flex; flex-direction: column; gap: ${sp('sm', 'xs')};
  `,
};
