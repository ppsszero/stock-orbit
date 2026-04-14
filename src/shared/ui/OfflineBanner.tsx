/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { FiWifiOff } from 'react-icons/fi';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { sem } from '@/shared/styles/semantic';
import { fontSize, fontWeight, spacing } from '@/shared/styles/tokens';

/** 오프라인 상태일 때 앱 상단에 표시되는 경고 배너 */
export const OfflineBanner = () => {
  const online = useNetworkStatus();
  if (online) return null;

  return (
    <div css={s.banner}>
      <FiWifiOff size={12} />
      <span>네트워크 연결 없음 — 데이터가 갱신되지 않습니다</span>
    </div>
  );
};

const s = {
  banner: css`
    display: flex; align-items: center; justify-content: center;
    gap: ${spacing.sm}px; padding: ${spacing.sm}px ${spacing.md}px;
    background: ${sem.action.warning}; color: ${sem.text.inverse};
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium};
    flex-shrink: 0;
  `,
};
