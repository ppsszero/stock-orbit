/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { useEffect, useState, useCallback } from 'react';
import { FiDownload, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { sem } from '@/shared/styles/semantic';
import { fontSize, fontWeight, spacing, radius, transition } from '@/shared/styles/tokens';
import { Modal } from '@/shared/ui/Modal';

type Phase = 'idle' | 'available' | 'downloading' | 'ready' | 'installing' | 'error' | 'up-to-date';

interface State {
  phase: Phase;
  version?: string;
  percent?: number;
  errorMessage?: string;
  dismissed?: boolean;
  isReDownload?: boolean;
}

/**
 * 자동 업데이트 in-app UI — 공통 Modal 컴포넌트 사용 (X 버튼 X, 하단 CTA로 일관).
 *
 * Phase별 액션:
 *   up-to-date  → 확인
 *   error       → 닫기
 *   available   → 백그라운드로 (다운로드는 계속됨)
 *   downloading → 백그라운드로 (진행률 표시)
 *   ready       → 나중에 / 지금 재시작 (2-button)
 *   installing  → 액션 없음 (전환 상태)
 *
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
        setState(prev => {
          // electron-updater delta 실패 → full 다운로드 fallback: percent가 큰 폭으로 감소하면 재다운로드로 간주
          const droppedBack = prev.percent != null && info.percent < prev.percent - 5;
          return {
            ...prev,
            phase: 'downloading',
            percent: info.percent,
            isReDownload: prev.isReDownload || droppedBack,
          };
        });
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
      console.log('[UpdateBanner] dev trigger ready. Try: __testUpdateBanner("downloading")');
    }

    return () => {
      cleanups.forEach(fn => fn());
      if (devTimer) clearInterval(devTimer);
    };
  }, []);

  const handleInstall = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'installing' }));
    window.electronAPI?.quitAndInstall();
  }, []);

  const handleDismiss = useCallback(() => {
    setState(prev => ({ ...prev, dismissed: true }));
  }, []);

  const open = state.phase !== 'idle' && !state.dismissed;

  return (
    <Modal open={open} onClose={handleDismiss}>
      <Modal.Overlay />
      <Modal.Content style={{ maxWidth: 300 }}>
        <div css={s.body}>
          <PhaseContent state={state} />
          <PhaseActions state={state} onDismiss={handleDismiss} onInstall={handleInstall} />
        </div>
      </Modal.Content>
    </Modal>
  );
};

/* ── Phase별 본문 (icon + title + desc + progress) ─────────────────────────── */

const PhaseContent = ({ state }: { state: State }) => {
  if (state.phase === 'up-to-date') {
    return (
      <>
        <div css={[s.iconCircle, s.iconSuccess]}><FiCheckCircle size={24} /></div>
        <div css={s.title}>최신 버전이에요</div>
        <div css={s.desc}>현재 사용 중인 버전이 최신입니다</div>
      </>
    );
  }
  if (state.phase === 'error') {
    return (
      <>
        <div css={[s.iconCircle, s.iconError]}><FiAlertCircle size={24} /></div>
        <div css={s.title}>업데이트 실패</div>
        <div css={s.desc}>{state.errorMessage || '알 수 없는 오류가 발생했어요'}</div>
      </>
    );
  }
  if (state.phase === 'ready') {
    return (
      <>
        <div css={[s.iconCircle, s.iconSuccess]}><FiDownload size={24} /></div>
        <div css={s.title}>v{state.version} 준비 완료</div>
        <div css={s.desc}>지금 재시작하면 새 버전으로 업데이트돼요</div>
      </>
    );
  }
  if (state.phase === 'installing') {
    return (
      <>
        <div css={[s.iconCircle, s.iconInfo]}><FiRefreshCw size={24} css={s.spinIcon} /></div>
        <div css={s.title}>재시작하는 중</div>
        <div css={s.desc}>잠시만 기다려주세요</div>
      </>
    );
  }
  // available / downloading
  const percent = state.percent ?? 0;
  const versionPrefix = state.version ? `v${state.version} ` : '';
  return (
    <>
      <div css={[s.iconCircle, s.iconInfo]}><FiRefreshCw size={24} css={s.spinIcon} /></div>
      <div css={s.title}>{versionPrefix}{state.isReDownload ? '재다운로드 중' : '다운로드 중'}</div>
      <div css={s.desc}>{percent}% 완료</div>
      <div css={s.progressTrack}>
        <div css={s.progressFill} style={{ width: `${percent}%` }} />
      </div>
    </>
  );
};

/* ── Phase별 액션 버튼 (Modal.Actions + Modal.CTA) ─────────────────────────── */

const PhaseActions = ({ state, onDismiss, onInstall }: { state: State; onDismiss: () => void; onInstall: () => void }) => {
  if (state.phase === 'up-to-date') {
    return (
      <Modal.Actions>
        <Modal.CTA onClick={onDismiss}>확인</Modal.CTA>
      </Modal.Actions>
    );
  }
  if (state.phase === 'error') {
    return (
      <Modal.Actions>
        <Modal.CTA onClick={onDismiss}>닫기</Modal.CTA>
      </Modal.Actions>
    );
  }
  if (state.phase === 'ready') {
    return (
      <Modal.Actions>
        <Modal.CTA variant="secondary" onClick={onDismiss}>나중에</Modal.CTA>
        <Modal.CTA onClick={onInstall}>지금 재시작</Modal.CTA>
      </Modal.Actions>
    );
  }
  if (state.phase === 'available' || state.phase === 'downloading') {
    return (
      <Modal.Actions>
        <Modal.CTA variant="secondary" onClick={onDismiss}>백그라운드로</Modal.CTA>
      </Modal.Actions>
    );
  }
  // installing — 전환 상태, 액션 없음
  return null;
};

// --- styles ---
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const s = {
  /* align-items: center 사용 X — Modal.Actions가 stretch 못 해서 버튼이 작아짐.
   * 대신 자식 요소에 margin auto / text-align center 개별 적용. */
  body: css`
    padding: ${spacing['2xl']}px ${spacing.xl}px ${spacing.xl}px;
    display: flex; flex-direction: column;
  `,
  iconCircle: css`
    width: 56px; height: 56px; border-radius: ${radius.full}px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto ${spacing.xl}px;
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
  `,
  progressTrack: css`
    width: 100%; height: 6px; border-radius: ${radius.sm}px;
    background: ${sem.bg.elevated}; overflow: hidden;
    margin-top: ${spacing.lg}px;
  `,
  progressFill: css`
    height: 100%; background: ${sem.action.primary};
    transition: width ${transition.fast} ease-out;
  `,
};
