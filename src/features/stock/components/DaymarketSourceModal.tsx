/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useEffect } from 'react';
import { StockSymbol, WebviewSource } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { Modal, CheckCircle } from '@/shared/ui';

interface Props {
  /** 선택 대상 종목 — null이면 닫힘 */
  symbol: StockSymbol | null;
  /** 소스 선택 — remember면 설정에 저장하고 다신 안 물어봄 */
  onSelect: (source: WebviewSource, remember: boolean) => void;
  onClose: () => void;
}

/**
 * 데이마켓 웹뷰 소스 선택 모달 — `daymarketWebviewSource === 'ask'`일 때
 * US 데이마켓(OVERNIGHT) 종목 클릭 시 표시.
 *
 * 야후가 primary — 네이버는 데이마켓 시세를 안 보여주므로 데이장에선 야후가 기본 추천.
 */
export const DaymarketSourceModal = ({ symbol, onSelect, onClose }: Props) => {
  const [remember, setRemember] = useState(false);
  const open = !!symbol;

  // 다시 열릴 때 체크 초기화 — 이전 클릭의 잔상 방지
  useEffect(() => {
    if (open) setRemember(false);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Overlay />
      <Modal.Content style={{ maxWidth: 300 }}>
        <div css={s.body}>
          <div css={s.title}>데이마켓 시세, 어디서 볼까요?</div>
          <p css={s.desc}>
            지금 데이마켓 거래 중이에요.
            <br />
            네이버에서는 데이마켓 시세가 보이지 않아요.
          </p>
          <button type="button" css={s.rememberRow} onClick={() => setRemember(r => !r)}>
            <CheckCircle checked={remember} />
            <span>선택 기억하기 · 설정에서 변경할 수 있어요</span>
          </button>
          <Modal.Actions>
            <Modal.CTA variant="secondary" onClick={() => onSelect('naver', remember)}>네이버</Modal.CTA>
            <Modal.CTA onClick={() => onSelect('yahoo', remember)}>야후</Modal.CTA>
          </Modal.Actions>
        </div>
      </Modal.Content>
    </Modal>
  );
};

const s = {
  body: css`
    padding: ${spacing['2xl']}px ${spacing.xl}px ${spacing.xl}px;
    display: flex; flex-direction: column;
  `,
  title: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary};
    text-align: center; margin-bottom: ${spacing.lg}px;
  `,
  desc: css`
    font-size: ${fontSize.md}px; color: ${sem.text.secondary};
    text-align: center; line-height: 1.5;
    margin-bottom: ${spacing.xl}px;
  `,
  rememberRow: css`
    display: flex; align-items: center; gap: ${spacing.md}px;
    align-self: center;
    padding: ${spacing.sm}px ${spacing.md}px;
    border: none; border-radius: ${radius.md}px;
    background: transparent;
    color: ${sem.text.secondary};
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium};
    font-family: inherit;
    cursor: pointer;
    transition: background ${transition.fast};
    &:hover { background: ${sem.action.primarySoft}; }
  `,
};
