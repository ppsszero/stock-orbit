/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ReactNode } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { spacing, fontSize, fontWeight, letterSpacing, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

/**
 * ListHeader — 페이지/섹션 상단의 목록 헤더 공통 컴포넌트.
 *
 * 디자인 시스템 인사이트(당근 등)에서 영감 — 컴파운드 패턴으로 title / description / right 슬롯 제공.
 * 앱 전역에 흩어진 그룹/섹션 헤더 (StockList의 "국내주식", EditSymbolsSheet의 섹션 헤더,
 * SettingsSheet 등)를 한 컴포넌트로 통합해 사이즈/색/여백 일관성 확보.
 *
 * 사용:
 *   <ListHeader
 *     title={<ListHeader.Title size="md">국내주식</ListHeader.Title>}
 *     right={<ListHeader.RightText>11개</ListHeader.RightText>}
 *     description={<ListHeader.Description>설명</ListHeader.Description>}
 *     descriptionPosition="bottom"
 *   />
 *
 * 우리 토큰 매핑:
 *   size lg = fontSize.lg(14) — 설정 행 라벨 같은 body-leading 텍스트
 *   size md = fontSize.base(13) — 메인 섹션 / 일반 body
 *   size sm = fontSize.sm(11) — 서브 섹션 / 캡션 (기본)
 *
 * Tag: t4/t5/t6/t7 같은 추상 typography 대신 우리 fontSize 토큰 그대로 사용.
 */

export type ListHeaderSize = 'lg' | 'md' | 'sm';

interface ListHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** description을 title 위/아래 중 어디에 배치할지. 기본 top */
  descriptionPosition?: 'top' | 'bottom';
  right?: ReactNode;
  /** right 요소 세로 정렬. 기본 center */
  rightAlignment?: 'center' | 'bottom';
  /** sticky 헤더 — 스크롤 컨테이너 안에서 상단 고정 (StockList 등) */
  sticky?: boolean;
  /** uppercase + wider letter-spacing — Settings 섹션 타이틀 같은 캡션 톤 */
  caps?: boolean;
  /** 추가 CSS class (감싸는 컨테이너에 적용) */
  className?: string;
}

interface ListHeaderComponent extends React.FC<ListHeaderProps> {
  Title: React.FC<TitleProps>;
  Description: React.FC<DescriptionProps>;
  RightText: React.FC<RightTextProps>;
  RightArrow: React.FC<RightArrowProps>;
}

const ListHeaderBase: React.FC<ListHeaderProps> = ({
  title, description, descriptionPosition = 'top',
  right, rightAlignment = 'center',
  sticky = false, caps = false, className,
}) => {
  const contentBlock = (
    <div css={[s.titleColumn, caps && s.caps]}>
      {description && descriptionPosition === 'top' && <div css={s.descWrap}>{description}</div>}
      {title}
      {description && descriptionPosition === 'bottom' && <div css={s.descWrap}>{description}</div>}
    </div>
  );

  return (
    <div css={[s.root, sticky && s.sticky]} className={className}>
      {contentBlock}
      {right && (
        <div css={[s.right, rightAlignment === 'bottom' && s.rightBottom]}>
          {right}
        </div>
      )}
    </div>
  );
};
ListHeaderBase.displayName = 'ListHeader';

/* ── Title ─────────────────────────────────────── */
interface TitleProps {
  children: ReactNode;
  size?: ListHeaderSize;
  weight?: 'bold' | 'semibold' | 'medium' | 'regular';
  color?: string;
}
const Title: React.FC<TitleProps> = ({ children, size = 'sm', weight = 'bold', color }) => (
  <span css={titleStyle(size, weight, color)}>{children}</span>
);
Title.displayName = 'ListHeader.Title';

/* ── Description ─────────────────────────────────────── */
interface DescriptionProps {
  children: ReactNode;
  color?: string;
}
const Description: React.FC<DescriptionProps> = ({ children, color }) => (
  <span css={descriptionStyle(color)}>{children}</span>
);
Description.displayName = 'ListHeader.Description';

/* ── RightText ─────────────────────────────────────── */
interface RightTextProps {
  children: ReactNode;
  size?: 'sm' | 'md';
  color?: string;
}
const RightText: React.FC<RightTextProps> = ({ children, size = 'sm', color }) => (
  <span css={rightTextStyle(size, color)}>{children}</span>
);
RightText.displayName = 'ListHeader.RightText';

/* ── RightArrow ─────────────────────────────────────── */
interface RightArrowProps {
  children?: ReactNode;
  size?: 'sm' | 'md';
  onClick?: () => void;
  ariaLabel?: string;
}
const RightArrow: React.FC<RightArrowProps> = ({ children, size = 'sm', onClick, ariaLabel }) => {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      css={rightArrowStyle(size, clickable)}
      onClick={onClick}
      disabled={!clickable}
      aria-label={ariaLabel}>
      {children && <span>{children}</span>}
      <FiChevronRight size={14} />
    </button>
  );
};
RightArrow.displayName = 'ListHeader.RightArrow';

export const ListHeader = ListHeaderBase as ListHeaderComponent;
ListHeader.Title = Title;
ListHeader.Description = Description;
ListHeader.RightText = RightText;
ListHeader.RightArrow = RightArrow;

/* ── Styles ─────────────────────────────────────── */
const SIZE_FONT: Record<ListHeaderSize, number> = {
  lg: fontSize.lg,    // 14 — 설정 행 라벨, body-leading 텍스트
  md: fontSize.base,  // 13 — 메인 섹션 / 일반 body
  sm: fontSize.sm,    // 11 — 서브 섹션 / 캡션 (기본)
};

const WEIGHT_MAP = {
  bold: fontWeight.bold,
  semibold: fontWeight.semibold,
  medium: fontWeight.medium,
  regular: fontWeight.normal,
} as const;

const titleStyle = (size: ListHeaderSize, weight: NonNullable<TitleProps['weight']>, color?: string) => css`
  font-size: ${SIZE_FONT[size]}px;
  font-weight: ${WEIGHT_MAP[weight]};
  color: ${color ?? sem.text.primary};
  line-height: 1.3;
  display: inline-flex; align-items: center; gap: ${spacing.sm}px;
`;

const descriptionStyle = (color?: string) => css`
  font-size: ${fontSize.sm}px;
  color: ${color ?? sem.text.tertiary};
  line-height: 1.4;
`;

const rightTextStyle = (size: 'sm' | 'md', color?: string) => css`
  font-size: ${size === 'md' ? fontSize.base : fontSize.sm}px;
  color: ${color ?? sem.text.tertiary};
  font-variant-numeric: tabular-nums;
`;

const rightArrowStyle = (size: 'sm' | 'md', clickable: boolean) => css`
  display: inline-flex; align-items: center; gap: ${spacing.xs}px;
  background: transparent; border: none; padding: 0;
  font-family: inherit; font-size: ${size === 'md' ? fontSize.base : fontSize.sm}px;
  color: ${sem.text.secondary};
  cursor: ${clickable ? 'pointer' : 'default'};
  transition: color ${transition.fast};
  &:hover:not(:disabled) { color: ${sem.text.primary}; }
  & svg { color: ${sem.text.tertiary}; flex-shrink: 0; }
`;

const s = {
  root: css`
    display: flex; align-items: center; justify-content: space-between;
    gap: ${spacing.md}px;
    padding: ${spacing.md}px ${spacing.xl}px;
    background: ${sem.bg.base};
  `,
  sticky: css`
    position: sticky; top: 0; z-index: 2;
  `,
  titleColumn: css`
    display: flex; flex-direction: column; gap: ${spacing.xs}px;
    min-width: 0; flex: 1;
  `,
  caps: css`
    text-transform: uppercase;
    letter-spacing: ${letterSpacing.wider}px;
  `,
  descWrap: css`
    display: flex; align-items: center;
  `,
  right: css`
    display: flex; align-items: center; flex-shrink: 0;
  `,
  rightBottom: css`
    align-self: flex-end;
  `,
};
