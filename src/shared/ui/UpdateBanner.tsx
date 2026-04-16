/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useEffect, useState, useCallback } from 'react';
import { FiDownload, FiRefreshCw, FiAlertCircle, FiX, FiCheckCircle } from 'react-icons/fi';
import { sem } from '@/shared/styles/semantic';
import { fontSize, fontWeight, spacing, radius, transition, shadow, sp, opacity } from '@/shared/styles/tokens';

type Phase = 'idle' | 'available' | 'downloading' | 'ready' | 'installing' | 'error' | 'up-to-date';

interface State {
  phase: Phase;
  version?: string;
  percent?: number;
  errorMessage?: string;
  dismissed?: boolean;
}

/**
 * 자동 업데이트 in-app UI — 중앙 모달 방식.
 *
 * Phase 흐름:
 *   available   → "새 버전 발견"
 *   downloading → 진행률 표시 + 퍼센트
 *   ready       → "지금 재시작" 버튼
 *   error       → 에러 메시지
 *
 * 사용자가 닫기(×)를 누르면 세션 동안 숨김.
 * Electron 없는 환경(dev browser)에서는 렌더링 안 함.
 */
export const UpdateBanner = () => {
  const [state, setState] = useState<State>({ phase: 'idle' });

  useEffect(() => {
    const api = window.electronAPI;
    const cleanups: Array<() => void> = [];

    if (api?.onUpdateAvailable) {
      const off1 = api.onUpdateAvailable((info) => {
        setState({ phase: 'available', version: info.version, dismissed: false });
      });
      const off2 = api.onUpdateProgress((info) => {
        setState(prev => ({ ...prev, phase: 'downloading', percent: info.percent }));
      });
      const off3 = api.onUpdateDownloaded((info) => {
        setState({ phase: 'ready', version: info.version, percent: 100, dismissed: false });
      });
      const off4 = api.onUpdateNotAvailable?.(() => {
        setState({ phase: 'up-to-date', dismissed: false });
      });
      const off5 = api.onUpdateError((info) => {
        setState(prev => ({ ...prev, phase: 'error', errorMessage: info.message }));
      });
      cleanups.push(off1, off2, off3, off5);
      if (off4) cleanups.push(off4);
    }

    // DEV: DevTools 콘솔에서 __testUpdateBanner('ready') 같이 트리거 가능
    let devTimer: ReturnType<typeof setInterval> | null = null;
    if (import.meta.env.DEV) {
      (window as unknown as { __testUpdateBanner: (phase: Phase | 'reset') => void }).__testUpdateBanner = (phase) => {
        if (devTimer) { clearInterval(devTimer); devTimer = null; }
        if (phase === 'reset' || phase === 'idle') {
          setState({ phase: 'idle' });
        } else if (phase === 'available') {
          setState({ phase: 'available', version: '1.0.2', dismissed: false });
        } else if (phase === 'downloading') {
          setState({ phase: 'downloading', version: '1.0.2', percent: 0, dismissed: false });
          let pct = 0;
          devTimer = setInterval(() => {
            pct += 5;
            if (pct >= 100) {
              if (devTimer) { clearInterval(devTimer); devTimer = null; }
              setState({ phase: 'ready', version: '1.0.2', percent: 100, dismissed: false });
            } else {
              setState(prev => ({ ...prev, percent: pct }));
            }
          }, 200);
        } else if (phase === 'ready') {
          setState({ phase: 'ready', version: '1.0.2', percent: 100, dismissed: false });
        } else if (phase === 'error') {
          setState({ phase: 'error', errorMessage: '네트워크 오류 테스트', dismissed: false });
        }
      };
      // eslint-disable-next-line no-console
      console.log('[UpdateBanner] dev trigger ready. Try: __testUpdateBanner("downloading")');
    }

    return () => {
      cleanups.forEach(fn => fn());
      if (devTimer) clearInterval(devTimer);
    };
  }, []);

  const handleInstall = useCallback(() => {
    // 버튼 중복 클릭 방지 + 설치 중 피드백
    setState(prev => ({ ...prev, phase: 'installing' }));
    window.electronAPI?.quitAndInstall();
  }, []);

  const handleDismiss = useCallback(() => {
    setState(prev => ({ ...prev, dismissed: true }));
  }, []);

  if (state.phase === 'idle' || state.dismissed) return null;

  return (
    <div css={s.backdrop}>
      <div css={s.card}>
        {state.phase !== 'installing' && (
          <button css={s.closeBtn} onClick={handleDismiss} aria-label="닫기">
            <FiX size={14} />
          </button>
        )}
        {renderContent(state, handleInstall, handleDismiss)}
      </div>
    </div>
  );
};

const renderContent = (state: State, onInstall: () => void, onDismiss: () => void) => {
  if (state.phase === 'up-to-date') {
    return (
      <>
        <div css={[s.iconCircle, s.iconSuccess]}>
          <FiCheckCircle size={24} />
        </div>
        <div css={s.title}>최신 버전이에요</div>
        <div css={s.desc}>현재 사용 중인 버전이 최신입니다</div>
        <button css={s.primaryBtn} onClick={onDismiss}>확인</button>
      </>
    );
  }

  if (state.phase === 'error') {
    return (
      <>
        <div css={[s.iconCircle, s.iconError]}>
          <FiAlertCircle size={24} />
        </div>
        <div css={s.title}>업데이트 실패</div>
        <div css={s.desc}>{state.errorMessage || '알 수 없는 오류가 발생했어요'}</div>
      </>
    );
  }

  if (state.phase === 'ready') {
    return (
      <>
        <div css={[s.iconCircle, s.iconSuccess]}>
          <FiDownload size={24} />
        </div>
        <div css={s.title}>v{state.version} 준비 완료</div>
        <div css={s.desc}>지금 재시작하면 새 버전으로 업데이트돼요</div>
        <button css={s.primaryBtn} onClick={onInstall}>
          지금 재시작
        </button>
      </>
    );
  }

  if (state.phase === 'installing') {
    return (
      <>
        <div css={[s.iconCircle, s.iconInfo]}>
          <FiRefreshCw size={24} css={s.spinIcon} />
        </div>
        <div css={s.title}>재시작하는 중</div>
        <div css={s.desc}>잠시만 기다려주세요</div>
      </>
    );
  }

  // available / downloading
  const percent = state.percent ?? 0;
  return (
    <>
      <div css={[s.iconCircle, s.iconInfo]}>
        <FiRefreshCw size={24} css={s.spinIcon} />
      </div>
      <div css={s.title}>{state.version ? `v${state.version} ` : ''}다운로드 중</div>
      <div css={s.desc}>{percent}% 완료</div>
      <div css={s.progressTrack}>
        <div css={s.progressFill} style={{ width: `${percent}%` }} />
      </div>
    </>
  );
};

// --- styles ---
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)); }
  to { opacity: 1; transform: translate(-50%, -50%); }
`;

const s = {
  backdrop: css`
    position: fixed; inset: 0; z-index: 100;
    background: ${sem.overlay.dim};
    display: flex; align-items: center; justify-content: center;
  `,
  card: css`
    position: relative;
    width: 100%; max-width: 300px;
    background: ${sem.surface.card}; border: 1px solid ${sem.border.default};
    border-radius: 14px;
    padding: ${spacing['3xl']}px ${spacing['2xl']}px ${spacing.xl}px;
    display: flex; flex-direction: column; align-items: center;
    box-shadow: ${shadow.lg};
    animation: ${fadeIn} ${transition.fast} ease-out;
  `,
  closeBtn: css`
    position: absolute; top: ${spacing.lg}px; right: ${spacing.lg}px;
    width: 26px; height: 26px; padding: 0;
    border: none; background: transparent; color: ${sem.text.tertiary};
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border-radius: ${radius.md}px;
    &:hover { background: ${sem.bg.elevated}; color: ${sem.text.primary}; }
  `,
  iconCircle: css`
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: ${spacing.xl}px;
  `,
  iconInfo: css`background: ${sem.action.primaryTint}; color: ${sem.action.primary};`,
  iconSuccess: css`background: ${sem.action.successTint}; color: ${sem.action.success};`,
  iconError: css`background: ${sem.action.dangerTint}; color: ${sem.action.danger};`,
  spinIcon: css`animation: ${spin} 1.2s linear infinite;`,
  title: css`
    font-size: ${fontSize.xl}px; font-weight: ${fontWeight.bold};
    color: ${sem.text.primary}; text-align: center;
    margin-bottom: ${spacing.md}px;
  `,
  desc: css`
    font-size: ${fontSize.md}px; color: ${sem.text.secondary};
    text-align: center; line-height: 1.5;
    margin-bottom: ${spacing.xl}px;
  `,
  progressTrack: css`
    width: 100%; height: 6px; border-radius: 3px;
    background: ${sem.bg.elevated}; overflow: hidden;
  `,
  progressFill: css`
    height: 100%; background: ${sem.action.primary};
    transition: width ${transition.fast} ease-out;
  `,
  primaryBtn: css`
    width: 100%; padding: ${sp('md', 'xs')}; border: none;
    background: ${sem.action.primary}; color: ${sem.text.inverse};
    border-radius: ${radius.xl}px;
    font-size: ${fontSize.lg}px; font-weight: ${fontWeight.semibold};
    cursor: pointer; transition: opacity ${transition.fast};
    &:hover { opacity: ${opacity.hover}; }
  `,
};
