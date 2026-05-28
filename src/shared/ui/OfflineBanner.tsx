/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { FiWifiOff } from 'react-icons/fi';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { sem } from '@/shared/styles/semantic';
import { fontSize, fontWeight, spacing, zIndex } from '@/shared/styles/tokens';

/**
 * 오프라인 상태 알림 배너.
 *
 * portal로 document.body 최상단에 fixed 렌더 — sheet/modal보다 위(zIndex.banner=650)에서
 * 어떤 화면에서도 동일하게 표시됨.
 *
 * 실제 렌더 높이를 ResizeObserver로 측정해 `--offline-banner-h` CSS 변수에 노출.
 * App container는 `padding-top: var(--offline-banner-h, 0)`로 TitleBar 가림 방지.
 *
 * 사고: 인터넷 끊긴 채 뉴스 시트 열면 빈 webview만 보여서 원인 파악 어려움 (2026-05-27).
 * 메인뿐 아니라 모든 시트/페이지에서 시각 알림 노출이 필요.
 */
export const OfflineBanner = () => {
  const online = useNetworkStatus();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 오프라인 아니면 변수 0으로 리셋 (다른 컴포가 의존할 수 있으므로 명시적으로 0 세팅)
    if (online) {
      document.body.style.setProperty('--offline-banner-h', '0px');
      return;
    }
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      document.body.style.setProperty('--offline-banner-h', `${el.offsetHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      // unmount 시 0으로 리셋 (online=true 분기에서도 한 번 더 호출돼도 무해)
      document.body.style.setProperty('--offline-banner-h', '0px');
    };
  }, [online]);

  if (online) return null;

  return ReactDOM.createPortal(
    <div ref={ref} css={s.banner}>
      <FiWifiOff size={12} />
      <span>네트워크 연결 없음 — 데이터가 갱신되지 않습니다</span>
    </div>,
    document.body
  );
};

const s = {
  banner: css`
    position: fixed; top: 0; left: 0; right: 0;
    z-index: ${zIndex.banner};
    display: flex; align-items: center; justify-content: center;
    gap: ${spacing.sm}px; padding: ${spacing.sm}px ${spacing.md}px;
    background: ${sem.action.warning}; color: ${sem.text.inverse};
    font-size: ${fontSize.sm}px; font-weight: ${fontWeight.medium};
  `,
};
