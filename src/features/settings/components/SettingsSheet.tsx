/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FiRotateCcw, FiTerminal, FiBell, FiCopy, FiFolder } from 'react-icons/fi';
import { AppSettings } from '@/shared/types';
import { spacing, fontSize, fontWeight, radius, height, shadow, transition } from '@/shared/styles/tokens';
import { sectionTitleStyle } from '@/shared/styles/sharedStyles';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useToast } from '@/shared/ui/Toast';
import { useSettingsActions } from '../hooks/useSettingsActions';
import { SheetLayout, SegmentedControl, Toggle } from '@/shared/ui';
import { useShortcutCapture } from '@/features/screenshot/hooks/useShortcutCapture';
import { useNoticeData, NoticeSheet } from '@/features/notice';
import { LogSheet } from './LogSheet';
import { sem } from '@/shared/styles/semantic';

interface Props {
  open: boolean; settings: AppSettings;
  onClose: () => void; onUpdate: (p: Partial<AppSettings>) => void;
  onReset: () => void;
}

const MODE_ITEMS = [
  { key: 'clipboard' as const, label: '클립보드 복사' },
  { key: 'file' as const, label: '파일 저장' },
];

const FONT_SIZES = [
  { key: 'small' as const, label: 'S' },
  { key: 'medium' as const, label: 'M' },
  { key: 'large' as const, label: 'L' },
  { key: 'xlarge' as const, label: 'XL' },
];

/**
 * 설정 시트 컴포넌트.
 *
 * 변경 사항:
 * 1. 해상도 변경 side effect → useSettingsActions hook으로 분리
 *    (이전: JSX inline에서 electronAPI.setSize 직접 호출)
 * 2. input parsing 로직을 hook 내부로 이동
 * 3. UI는 "의도"만 전달 (updateResolutionWidth/Height)
 */
const DEV_EMAIL = 'ppsszero@gmail.com';

/**
 * 해상도 숫자 입력 — 타이핑 중에는 local state로 유지,
 * blur/Enter 시에만 commit하여 빈 값 스냅백·재조합 버그 방지.
 *
 * 외부에서 `value`가 바뀌면 (예: 사용자가 창을 직접 드래그 리사이즈)
 * 포커스 없을 때만 sync. 입력 중엔 덮어쓰지 않음.
 */
const ResolutionInput = ({ value, onCommit, styleClass }: {
  value: number;
  onCommit: (v: string) => void;
  styleClass: ReturnType<typeof css>;
}) => {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      css={styleClass}
      value={text}
      onFocus={() => { focused.current = true; }}
      onChange={e => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        onCommit(text);
        setText(String(value)); // commit 실패(무효값) 시 원복
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(String(value));
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
};

export const SettingsSheet = ({ open, settings, onClose, onUpdate, onReset }: Props) => {
  const confirm = useConfirm();
  const toast = useToast();
  const { commitResolutionWidth, commitResolutionHeight } = useSettingsActions(settings, onUpdate);
  const { notices, hasNew, loading: noticeLoading, markSeen, refresh: refreshNotice } = useNoticeData();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [defaultScreenshotPath, setDefaultScreenshotPath] = useState('');

  const handleShortcutChange = useCallback((shortcut: string) => {
    onUpdate({ screenshot: { ...settings.screenshot, shortcut } });
  }, [settings.screenshot, onUpdate]);

  const { shortcut, capturing, startCapture, handleKeyDown, handleBlur } = useShortcutCapture(settings.screenshot.shortcut, handleShortcutChange);

  const handleSelectFolder = useCallback(async () => {
    const path = await window.electronAPI?.selectFolder(settings.screenshot.savePath || '');
    if (path) onUpdate({ screenshot: { ...settings.screenshot, savePath: path } });
  }, [settings.screenshot, onUpdate]);

  useEffect(() => {
    window.electronAPI?.getAppVersion().then(v => setAppVersion(v));
    window.electronAPI?.getDefaultScreenshotPath().then(p => setDefaultScreenshotPath(p));
  }, []);

  const handleNoticeOpen = () => { setNoticeOpen(true); markSeen(); };
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(DEV_EMAIL);
    toast.show('이메일을 복사했어요', 'copy');
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: '전체 초기화',
      message: '모든 설정과 그룹을 초기화할까요?\n이 작업은 되돌릴 수 없어요.',
      confirmText: '초기화할게요', cancelText: '아니요', danger: true,
    });
    if (ok) onReset();
  };

  return (
    <SheetLayout open={open} title="설정" zIndex={500} onClose={onClose}>
      <div css={s.content}>
        <div css={s.secT}>일반</div>
        <SettingRow label="윈도우 시작 시 자동실행">
          <Toggle checked={settings.autoLaunch} onChange={v => onUpdate({ autoLaunch: v })} />
        </SettingRow>
        <SettingRow label="항상 맨 위에 고정">
          <Toggle checked={settings.alwaysOnTop} onChange={v => onUpdate({ alwaysOnTop: v })} />
        </SettingRow>
        <SettingRow label="새로고침 간격">
          <select css={s.ctrl} value={settings.refreshInterval}
            onChange={e => onUpdate({ refreshInterval: parseInt(e.target.value) })}>
            <option value="30">30초</option>
            <option value="60">1분</option>
            <option value="180">3분</option>
            <option value="300">5분</option>
            <option value="600">10분</option>
          </select>
        </SettingRow>

        <div css={s.secT}>디스플레이</div>
        <SettingRow label="해상도">
          <div css={s.pair}>
            <ResolutionInput value={settings.resolution.width} onCommit={commitResolutionWidth} styleClass={s.numIn} />
            <span css={s.x}>×</span>
            <ResolutionInput value={settings.resolution.height} onCommit={commitResolutionHeight} styleClass={s.numIn} />
          </div>
        </SettingRow>
        <SettingRow label="글자 크기">
          <SegmentedControl items={FONT_SIZES} value={settings.fontSize} onChange={v => onUpdate({ fontSize: v })} size="md" />
        </SettingRow>
        <div css={s.sliderSection}>
          <span>스크롤 속도</span>
          <div css={s.sliderWrap}>
            <input type="range" min="20" max="120" value={settings.tickerSpeed}
              onChange={e => onUpdate({ tickerSpeed: parseInt(e.target.value) })} css={s.slider} />
            <span css={s.sliderVal}>{settings.tickerSpeed}</span>
          </div>
        </div>

        <div css={s.secT}>스크린샷</div>
        <SettingRow label="단축키">
          <input
            css={s.shortcutInput(capturing)}
            value={capturing ? '키를 입력하세요...' : shortcut}
            readOnly
            onClick={startCapture}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </SettingRow>
        <SettingRow label="처리 방식">
          <SegmentedControl
            items={MODE_ITEMS}
            value={settings.screenshot.mode}
            onChange={mode => onUpdate({ screenshot: { ...settings.screenshot, mode } })}
            size="md"
          />
        </SettingRow>
        {settings.screenshot.mode === 'file' && (
          <SettingRow label="저장 경로">
            <div css={s.pathRow}>
              <span css={s.pathText}>{settings.screenshot.savePath || defaultScreenshotPath || '...'}</span>
              <button css={s.folderBtn} onClick={handleSelectFolder} aria-label="폴더 선택">
                <FiFolder size={14} />
              </button>
            </div>
          </SettingRow>
        )}

        <div css={s.secT}>시스템</div>
        <SettingRow label="오래된 시스템 로그 자동 삭제">
          <Toggle checked={settings.autoCleanLogs} onChange={v => onUpdate({ autoCleanLogs: v })} />
        </SettingRow>
        <SettingRow label="시스템 로그">
          <button css={s.logBtn} onClick={() => setLogOpen(true)}><FiTerminal size={12} /> 더보기</button>
        </SettingRow>

        <div css={s.secT}>앱 정보</div>
        <SettingRow label="앱 버전">
          <span css={s.infoText}>v{appVersion || '...'}</span>
        </SettingRow>
        <SettingRow label="공지사항">
          <button css={s.logBtn} onClick={handleNoticeOpen}>
            <FiBell size={12} /> 더보기
            {hasNew && <span css={s.badge} />}
          </button>
        </SettingRow>
        <SettingRow label="개발자 문의">
          <button css={s.emailBtn} onClick={handleCopyEmail}>
            <span>{DEV_EMAIL}</span>
            <FiCopy size={11} />
          </button>
        </SettingRow>

        <div css={s.secT}>위험 영역</div>
        <div css={s.resetRow}>
          <button css={s.resetBtn} onClick={handleReset}>
            <FiRotateCcw size={14} /><span>전체 초기화</span>
          </button>
          <span css={s.resetHint}>설정, 그룹, 종목 데이터를 모두 초기 상태로 되돌립니다</span>
        </div>
      </div>

      <NoticeSheet
        open={noticeOpen} notices={notices} loading={noticeLoading}
        onClose={() => setNoticeOpen(false)} onRefresh={refreshNotice}
      />
      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} />
    </SheetLayout>
  );
};

/**
 * 설정 Row 레이아웃 컴포넌트.
 * 이름을 Row → SettingRow로 변경하여 역할을 명확히 함.
 */
const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div css={s.row}>
    <span>{label}</span>
    {children}
  </div>
);

const s = {
  content: css`flex: 1; overflow-y: auto; padding: ${spacing.sm}px 0;`,
  secT: sectionTitleStyle,
  row: css`
    display: flex; align-items: center; height: ${height.row}px;
    padding: 0 ${spacing.xl}px; font-size: ${fontSize.lg}px; color: ${sem.text.primary}; gap: ${spacing.lg}px;
    & > span:first-of-type { flex: 1; white-space: nowrap; }
  `,
  ctrl: css`
    height: ${height.control}px; padding: 0 ${spacing.md + 2}px;
    border: 1px solid ${sem.border.default}; border-radius: ${radius.lg}px;
    background: ${sem.bg.surface}; color: ${sem.text.primary}; font-size: ${fontSize.base}px;
    outline: none; cursor: pointer; flex-shrink: 0;
  `,
  pair: css`display: flex; align-items: center; gap: ${spacing.md - 2}px; flex-shrink: 0;`,
  numIn: css`
    width: 84px; height: ${height.control}px; padding: 0 ${spacing.md}px;
    border: 1px solid ${sem.border.default}; border-radius: ${radius.lg}px;
    background: ${sem.bg.surface}; color: ${sem.text.primary}; font-size: ${fontSize.base}px;
    text-align: center; outline: none;
    &:focus { border-color: ${sem.action.primary}; }
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  `,
  x: css`font-size: ${fontSize.md}px; color: ${sem.text.tertiary};`,
  logBtn: css`
    height: ${height.control}px; padding: 0 ${spacing.lg}px;
    border: 1px solid ${sem.border.default}; background: ${sem.bg.surface}; border-radius: ${radius.lg}px;
    color: ${sem.text.secondary}; font-size: ${fontSize.md}px; font-weight: ${fontWeight.semibold};
    cursor: pointer; display: flex; align-items: center; gap: ${spacing.sm}px; flex-shrink: 0;
    &:hover { background: ${sem.bg.elevated}; }
  `,
  sliderSection: css`
    padding: ${spacing.lg}px ${spacing.xl}px;
    display: flex; justify-content: space-between; align-items: center; gap: ${spacing.md}px;
    font-size: ${fontSize.lg}px; color: ${sem.text.primary};
  `,
  sliderWrap: css`display: flex; align-items: center; gap: ${spacing.md + 2}px; min-width:180px `,
  slider: css`
    -webkit-appearance: none; flex: 1; height: ${spacing.sm}px;
    border-radius: ${radius.xs}px; background: ${sem.bg.elevated}; outline: none;
    &::-webkit-slider-thumb {
      -webkit-appearance: none; width: ${spacing.xl}px; height: ${spacing.xl}px;
      border-radius: ${radius.full}px; background: ${sem.action.primary};
      cursor: pointer; border: 2px solid ${sem.bg.base};
      box-shadow: ${shadow.sm};
    }
  `,
  sliderVal: css`font-size: ${fontSize.md}px; color: ${sem.text.secondary}; min-width: 24px; text-align: right;`,
  resetRow: css`padding: ${spacing.md}px ${spacing.xl}px; display: flex; flex-direction: column; gap: ${spacing.md}px;`,
  resetBtn: css`
    height: ${height.row}px; border: 1px solid ${sem.action.danger}; background: transparent; border-radius: ${radius.xl}px;
    color: ${sem.action.danger}; font-size: ${fontSize.base}px; font-weight: ${fontWeight.semibold};
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: ${spacing.md - 2}px;
    transition: all ${transition.fast}; &:hover { background: ${sem.action.dangerTint}; }
  `,
  resetHint: css`font-size: ${fontSize.sm}px; color: ${sem.text.tertiary}; text-align: center;`,
  badge: css`
    width: 6px; height: 6px; border-radius: 50%;
    background: ${sem.action.danger}; flex-shrink: 0;
  `,
  infoText: css`
    font-size: ${fontSize.md}px; color: ${sem.text.secondary};
    font-weight: ${fontWeight.semibold}; flex-shrink: 0;
  `,
  emailBtn: css`
    height: ${height.control}px; padding: 0 ${spacing.lg}px;
    border: 1px solid ${sem.border.default}; background: ${sem.bg.surface}; border-radius: ${radius.lg}px;
    color: ${sem.text.secondary}; font-size: ${fontSize.sm}px; font-weight: ${fontWeight.semibold};
    font-family: inherit; cursor: pointer;
    display: flex; align-items: center; gap: ${spacing.sm}px; flex-shrink: 0;
    &:hover { background: ${sem.bg.elevated}; }
  `,
  shortcutInput: (capturing: boolean) => css`
    width: 120px; height: ${height.control}px; padding: 0 ${spacing.md}px;
    border: 1px solid ${capturing ? sem.action.primary : sem.border.default};
    border-radius: ${radius.lg}px; background: ${sem.bg.surface};
    color: ${capturing ? sem.action.primary : sem.text.primary};
    font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold};
    font-family: inherit; text-align: center;
    cursor: pointer; outline: none;
    transition: border-color ${transition.fast};
  `,
  pathRow: css`
    display: flex; align-items: center; gap: ${spacing.sm}px;
    max-width: 200px; flex-shrink: 0;
  `,
  pathText: css`
    font-size: ${fontSize.sm}px; color: ${sem.text.secondary};
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    flex: 1; min-width: 0; text-align: right;
  `,
  folderBtn: css`
    width: 28px; height: 28px; border: 1px solid ${sem.border.default};
    border-radius: ${radius.md}px; background: transparent;
    color: ${sem.text.secondary}; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-family: inherit;
    transition: all ${transition.fast};
    &:hover { background: ${sem.bg.surface}; color: ${sem.text.primary}; }
  `,
};
