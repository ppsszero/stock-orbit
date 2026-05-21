/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { StockPrice, StockSymbol } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, sp } from '@/shared/styles/tokens';
import { fmtNum, dirSign, fmtPercent, getLogoUrl, getDisplayName, getDirColor } from '@/shared/utils/format';
import { sem } from '@/shared/styles/semantic';
import { Modal } from '@/shared/ui';

interface Props {
  symbol: StockSymbol | null;
  price: StockPrice | null;
  onClose: () => void;
}

const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div css={s.row}>
    <span css={s.label}>{label}</span>
    <span css={s.value} style={color ? { color } : undefined}>{value}</span>
  </div>
);

export const StockDetailModal = ({ symbol, price, onClose }: Props) => {
  const open = !!symbol && !!price;
  if (!symbol || !price) {
    return <Modal open={open} onClose={onClose}>{null}</Modal>;
  }
  const p = price;
  const c = p.currency;
  const dirColor = getDirColor(p.changeDirection);

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content>
        {/* 헤더 — X 버튼 없음. 정보 중심. */}
        <div css={s.header}>
          <img
            src={getLogoUrl(symbol.nation, symbol.code, symbol.reutersCode)}
            alt="" css={s.logo}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div css={s.name}>{getDisplayName(p, symbol)}</div>
          <div css={s.codeLine}>
            <span css={s.tag}>{symbol.reutersCode || symbol.code}</span>
            {p.exchange && <span css={s.tag}>{p.exchange}</span>}
            {p.isTradingHalt
              ? <span css={s.tagHalt}>거래정지</span>
              : <span css={s.tagStatus[String(p.marketStatus === 'OPEN')]}>{p.marketStatus === 'OPEN' ? 'LIVE' : 'CLOSE'}</span>
            }
          </div>
        </div>

        {/* 현재가 */}
        <div css={s.priceSection}>
          <span css={s.currentPrice}>{fmtNum(p.currentPrice, c)}</span>
          <span css={css`color: ${dirColor}; font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};`}>
            {dirSign(p.changeDirection)}{fmtNum(Math.abs(p.change), c)} ({fmtPercent(p.changeDirection, p.changePercent)})
          </span>
        </div>

        {/* 상세 그리드 */}
        <div css={s.body}>
          <div css={s.sectionTitle}>가격 정보</div>
          <div css={s.grid}>
            {p.openPrice ? <Row label="시가" value={fmtNum(p.openPrice, c)} /> : null}
            {p.highPrice ? <Row label="고가" value={fmtNum(p.highPrice, c)} color={sem.feedback.up} /> : null}
            {p.lowPrice ? <Row label="저가" value={fmtNum(p.lowPrice, c)} color={sem.feedback.down} /> : null}
            <Row label="전일종가" value={fmtNum(p.previousClose, c)} />
          </div>

          {(p.volume || p.tradingValue || p.marketCap) && <>
            <div css={s.sectionTitle}>거래 정보</div>
            <div css={s.grid}>
              {p.volume && <Row label="거래량" value={p.volume} />}
              {p.tradingValue && <Row label="거래대금" value={p.tradingValue} />}
              {p.marketCap && <Row label="시가총액" value={p.marketCap} />}
            </div>
          </>}
        </div>

        {/* CTA */}
        <div css={s.ctaWrap}>
          <Modal.CTA onClick={onClose}>확인</Modal.CTA>
        </div>
      </Modal.Content>
    </Modal>
  );
};

const s = {
  header: css`
    position: relative;
    display: flex; flex-direction: column; align-items: center;
    padding: ${spacing.xl}px ${spacing.xl}px ${spacing.lg}px;
    gap: ${sp('sm', 'xs')};
    &::after {
      content: ''; position: absolute; left: ${spacing.xl}px; right: ${spacing.xl}px; bottom: 0;
      height: 1px; background: ${sem.border.subtle};
    }
  `,
  logo: css`width: ${spacing['4xl']}px; height: ${spacing['4xl']}px; border-radius: 50%; object-fit: cover; background: ${sem.bg.elevated};`,
  name: css`font-size: ${fontSize.lg}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; text-align: center;`,
  codeLine: css`display: flex; align-items: center; justify-content: center; gap: ${spacing.sm}px;`,
  tag: css`
    padding: ${spacing.xs}px ${spacing.sm + 3}px; border-radius: ${radius.sm}px; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold};
    background: ${sem.bg.elevated}; color: ${sem.text.tertiary}; line-height: 1;
  `,
  tagStatus: {
    true: css`padding: ${spacing.xs}px ${spacing.sm + 3}px; border-radius: ${radius.sm}px; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold}; line-height: 1; background: ${sem.action.successTint}; color: ${sem.action.success};`,
    false: css`padding: ${spacing.xs}px ${spacing.sm + 3}px; border-radius: ${radius.sm}px; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold}; line-height: 1; background: ${sem.overlay.subtle}; color: ${sem.text.tertiary};`,
  } as Record<string, ReturnType<typeof css>>,
  tagHalt: css`
    padding: ${spacing.xs}px ${spacing.sm + 3}px; border-radius: ${radius.sm}px; font-size: ${fontSize.xs}px; font-weight: ${fontWeight.semibold}; line-height: 1;
    background: ${sem.action.dangerTint}; color: ${sem.action.danger};
  `,
  priceSection: css`
    position: relative;
    padding: ${sp('lg', 'xs')} ${spacing.xl}px;
    display: flex; flex-direction: column; align-items: center; gap: ${spacing.xs}px;
    &::after {
      content: ''; position: absolute; left: ${spacing.xl}px; right: ${spacing.xl}px; bottom: 0;
      height: 1px; background: ${sem.border.subtle};
    }
  `,
  currentPrice: css`font-size: ${fontSize['3xl']}px; font-weight: ${fontWeight.extrabold}; color: ${sem.text.primary}; font-variant-numeric: tabular-nums;`,
  body: css`flex: 1; padding: ${spacing.md}px 0; overflow-y: auto;`,
  sectionTitle: css`font-size: ${fontSize.sm}px; font-weight: ${fontWeight.bold}; color: ${sem.text.tertiary}; padding: ${sp('md', 'xs')} ${spacing.xl}px ${spacing.sm}px; text-transform: uppercase; letter-spacing: 0.3px;`,
  grid: css`display: flex; flex-direction: column;`,
  row: css`display: flex; align-items: center; justify-content: space-between; padding: ${spacing.md}px ${spacing.xl}px;`,
  label: css`font-size: ${fontSize.md}px; color: ${sem.text.tertiary};`,
  value: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold}; color: ${sem.text.secondary}; font-variant-numeric: tabular-nums;`,
  ctaWrap: css`
    flex-shrink: 0;
    padding: ${spacing.lg}px ${spacing.xl}px ${spacing.xl}px;
  `,
};
