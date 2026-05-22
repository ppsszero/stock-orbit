/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiExternalLink } from 'react-icons/fi';
import { spacing, fontSize, fontWeight } from '@/shared/styles/tokens';
import { Sector, SectorStock, SectorNation, getNaverStockUrl } from '@/shared/naver';
import { sem } from '@/shared/styles/semantic';
import { listRowStyle } from '@/shared/styles/sharedStyles';
import { dirArrow, fmtNum, getDirColor, getLogoUrl } from '@/shared/utils/format';
import { StockLogo, BottomSheet } from '@/shared/ui';

interface Props {
  sector: Sector | null;
  nation: SectorNation;
  onClose: () => void;
  onStockClick: (url: string) => void;
}

const fmtChange = (rate: number): string => `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;

const sectorIndustryUrl = (nation: SectorNation, code: string): string =>
  nation === 'domestic'
    ? `https://m.stock.naver.com/domestic/home/industry/${code}`
    : `https://m.stock.naver.com/worldstock/home/USA/industry/${code}`;

const StockRow = ({ stock, onClick }: { stock: SectorStock; onClick: () => void }) => {
  const dirColor = getDirColor(stock.direction);
  const isUS = stock.nation === 'US';
  const logoKey = isUS ? (stock.reutersCode || stock.code) : stock.code;
  return (
    <div css={[listRowStyle, s.row]} onClick={onClick} role="button">
      <StockLogo
        src={getLogoUrl(stock.nation, stock.code, stock.reutersCode)}
        fallbackChar={stock.name.charAt(0)}
        fallbackBg={sem.bg.elevated}
        fallbackFg={sem.text.secondary}
        size={32}
      />
      <div css={s.info}>
        <span css={s.name}>{stock.name}</span>
        <span css={s.code}>{logoKey}</span>
      </div>
      <div css={s.vals}>
        <span css={s.price}>{fmtNum(stock.currentPrice, stock.currency)}</span>
        <span css={css`color:${dirColor};font-size:${fontSize.sm}px;font-weight:${fontWeight.semibold};font-variant-numeric:tabular-nums;`}>
          {dirArrow(stock.direction)} {Math.abs(stock.changePercent).toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

export const SectorDetail = ({ sector, nation, onClose, onStockClick }: Props) => {
  const open = !!sector;
  if (!sector) {
    return <BottomSheet open={open} onClose={onClose} />;
  }

  const dirColor = getDirColor(sector.changeRate > 0 ? 'up' : sector.changeRate < 0 ? 'down' : 'flat');
  const moreUrl = sectorIndustryUrl(nation, sector.code);

  const header = (
    <BottomSheet.Header>
      <span css={s.headerName}>{sector.name}</span>
      <span css={css`color:${dirColor};font-size:${fontSize.lg}px;font-weight:${fontWeight.bold};font-variant-numeric:tabular-nums;margin-left:${spacing.md}px;`}>
        {fmtChange(sector.changeRate)}
      </span>
    </BottomSheet.Header>
  );

  const description = (
    <BottomSheet.HeaderDescription>
      <span css={css`color:${sem.feedback.up};font-weight:${fontWeight.bold};`}>상승 {sector.risingCount.toLocaleString()}</span>
      <span css={s.dot}> · </span>
      <span css={s.flat}>보합 {sector.unchangedCount.toLocaleString()}</span>
      <span css={s.dot}> · </span>
      <span css={css`color:${sem.feedback.down};font-weight:${fontWeight.bold};`}>하락 {sector.fallingCount.toLocaleString()}</span>
    </BottomSheet.HeaderDescription>
  );

  const cta = (
    <BottomSheet.CTA onClick={() => { onStockClick(moreUrl); onClose(); }}>
      <span>업종 보러가기</span>
      <FiExternalLink size={14} />
    </BottomSheet.CTA>
  );

  return (
    <BottomSheet open={open} onClose={onClose} header={header} headerDescription={description} cta={cta}>
      <div css={s.sectionTitle}>대표 종목</div>
      {sector.topStocks.length === 0
        ? <div css={s.empty}>대표 종목이 없습니다</div>
        : sector.topStocks.map(stock => (
            <StockRow key={stock.code} stock={stock} onClick={() => {
              onStockClick(getNaverStockUrl({
                code: stock.code,
                nation: stock.nation,
                reutersCode: stock.reutersCode,
              }));
              onClose();
            }} />
          ))
      }
    </BottomSheet>
  );
};

const s = {
  headerName: css`color: ${sem.text.primary};`,
  dot: css`color: ${sem.text.tertiary};`,
  flat: css`color: ${sem.feedback.flat}; font-weight: ${fontWeight.semibold};`,
  sectionTitle: css`
    font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold};
    color: ${sem.text.tertiary};
    letter-spacing: 0.04em;
    padding-bottom: ${spacing.sm}px;
  `,
  row: css`gap: ${spacing.md}px; padding: ${spacing.lg}px ${spacing.md}px;`,
  info: css`flex: 1; display: flex; flex-direction: column; gap: ${spacing.xs}px; min-width: 0;`,
  name: css`
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold};
    color: ${sem.text.primary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  `,
  code: css`font-size: ${fontSize.xs}px; color: ${sem.text.tertiary};`,
  vals: css`display: flex; flex-direction: column; align-items: flex-end; gap: ${spacing.xs}px; flex-shrink: 0;`,
  price: css`
    font-size: ${fontSize.md}px; font-weight: ${fontWeight.bold};
    color: ${sem.text.primary}; font-variant-numeric: tabular-nums;
  `,
  empty: css`padding: ${spacing['4xl']}px; text-align: center; color: ${sem.text.tertiary};`,
};
