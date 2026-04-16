/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useRef, useCallback, memo } from 'react';
import { FiX } from 'react-icons/fi';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { useBackAction } from '@/shared/hooks/useBackAction';
import logoSvg from '../../assets/logo.svg';
import { spacing, fontSize, fontWeight, radius, transition, zIndex, letterSpacing , sp } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

interface Props {
  isDark: boolean;
  opacity: number;
  onToggleTheme: () => void;
  onOpacityChange: (v: number) => void;
  onClose: () => void;
}

/**
 * 타이틀 바 — Dumb Component.
 *
 * 변경 사항:
 * 1. memo 적용 — props 변경 없으면 리렌더 방지
 * 2. useOutsideClick hook 사용 (중복 제거)
 * 3. CSS 변수 기반 스타일링 (런타임 CSS 생성 제거)
 */
export const TitleBar = memo(({
  isDark, opacity, onToggleTheme, onOpacityChange, onClose,
}: Props) => {
  const [showOpacity, setShowOpacity] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const closePopup = useCallback(() => setShowOpacity(false), []);
  useOutsideClick(popRef, showOpacity, closePopup);
  useBackAction(showOpacity, closePopup);

  const togglePopup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOpacity(v => !v);
  }, []);

  const handleOpacity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onOpacityChange(parseInt(e.target.value) / 100);
  }, [onOpacityChange]);

  return (
    <div css={s.bar(showOpacity)} onClick={() => showOpacity && setShowOpacity(false)}>
      <div css={s.left}>
        <img src={logoSvg} alt="" css={s.logo} />
        <span css={s.title}>ORBIT<span css={s.sub}> with Npay 증권</span></span>
      </div>
      <div css={s.actions}>
        <Tooltip content={isDark ? '라이트 모드' : '다크 모드'} position="bottom" display="inline-flex">
          <button css={s.btn} onClick={onToggleTheme} aria-label={isDark ? '라이트 모드' : '다크 모드'}>
            {isDark ? '☀️' : '🌙'}
          </button>
        </Tooltip>
        <div css={s.rel} ref={popRef}>
          <Tooltip content="투명도 조절" position="bottom" display="inline-flex">
            <button css={s.btn} onClick={togglePopup} aria-label="투명도 조절">💧</button>
          </Tooltip>
          {showOpacity && (
            <div css={s.pop} onClick={e => e.stopPropagation()}>
              <input type="range" min="30" max="100" step="1"
                value={Math.round(opacity * 100)} onChange={handleOpacity} css={s.slider} />
              <span css={s.sliderVal}>{Math.round(opacity * 100)}%</span>
            </div>
          )}
        </div>
        <Tooltip content="트레이로 숨김" position="bottom" display="inline-flex">
          <button css={s.closeBtn} onClick={onClose}><FiX size={14} /></button>
        </Tooltip>
      </div>
    </div>
  );
});

const s = {
  bar: (popOpen: boolean) => css`
    display: flex; align-items: center; justify-content: space-between;
    height: 42px; padding: 0 ${spacing.md}px;
    background: ${sem.surface.titleBar};
    -webkit-app-region: ${popOpen ? 'no-drag' : 'drag'};
    border-radius: ${radius['2xl']}px ${radius['2xl']}px 0 0; flex-shrink: 0;
  `,
  left: css`display: flex; align-items: center; gap: ${spacing.sm + 2}px;`,
  logo: css`width: ${spacing.xl}px; height: ${spacing.xl}px;`,
  title: css`font-size: ${fontSize.base}px; font-weight: ${fontWeight.bold}; color: ${sem.text.primary}; letter-spacing: ${letterSpacing.tight}px;`,
  sub: css`font-size: ${fontSize.xs}px; font-weight: ${fontWeight.medium}; color: ${sem.text.secondary}; letter-spacing: ${letterSpacing.normal}px;`,
  actions: css`display: flex; align-items: center; gap: ${spacing.xs}px; -webkit-app-region: no-drag;`,
  btn: css`
    width: 30px; height: 30px; border: none; background: transparent;
    border-radius: ${radius.md}px; cursor: pointer; font-size: ${fontSize.lg}px; color: ${sem.text.secondary};
    display: flex; align-items: center; justify-content: center;
    transition: background ${transition.fast}; &:hover { background: ${sem.bg.surface}; }
  `,
  closeBtn: css`
    width: 30px; height: 30px; border: none; background: transparent;
    border-radius: ${radius.md}px; cursor: pointer; font-size: ${fontSize.md}px; color: ${sem.text.secondary};
    display: flex; align-items: center; justify-content: center;
    transition: all ${transition.fast}; &:hover { background: ${sem.action.danger}; color: ${sem.text.inverse}; }
  `,
  rel: css`position: relative;`,
  pop: css`
    position: absolute; top: 36px; right: -20px;
    background: ${sem.surface.popover}; border: 1px solid ${sem.border.default};
    border-radius: ${radius['2xl']}px; padding: ${sp('lg', 'xs')} ${spacing.xl}px; box-shadow: ${sem.shadow.popover};
    z-index: ${zIndex.dropdown}; display: flex; align-items: center; gap: ${sp('md', 'xs')}; min-width: 180px;
  `,
  slider: css`
    -webkit-appearance: none; flex: 1; height: ${spacing.sm}px; border-radius: ${spacing.xs}px;
    background: ${sem.bg.elevated}; outline: none;
    &::-webkit-slider-thumb {
      -webkit-appearance: none; width: ${spacing.xl}px; height: ${spacing.xl}px; border-radius: 50%;
      background: ${sem.action.primary}; cursor: pointer; border: 2px solid ${sem.surface.card};
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
  `,
  sliderVal: css`font-size: ${fontSize.md}px; color: ${sem.text.secondary}; min-width: ${spacing['4xl']}px; text-align: right;`,
};
