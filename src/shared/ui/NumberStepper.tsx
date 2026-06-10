/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { useState, useRef, useEffect } from 'react';
import { spacing, fontSize, fontWeight, radius, transition } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  /** Controlled: 외부에서 값 관리. onChange와 함께 사용. */
  value?: number;
  onChange?: (value: number) => void;
  /** Uncontrolled: 초기값. value/onChange 없이 단독 사용. 빈 입력 fallback은 controlled value 우선. */
  defaultValue?: number;

  min?: number;
  max?: number;
  step?: number;
  /** 입력 확정(blur) 시 값이 min/max를 벗어나 clamp된 경우 호출 — 안내 토스트 등에 사용 */
  onClamp?: (attempted: number, clamped: number) => void;
  disabled?: boolean;
  size?: Size;
  inputWidth?: number;
  decreaseLabel?: string;
  increaseLabel?: string;
}

const SIZE_MAP: Record<Size, { btn: number; wrap: number; input: number }> = {
  sm: { btn: 24, wrap: 28, input: 32 },
  md: { btn: 28, wrap: 32, input: 40 },
  lg: { btn: 32, wrap: 36, input: 48 },
};

export const NumberStepper = ({
  value: controlled, onChange, defaultValue = 0,
  min = 0, max = 999, step = 1, onClamp,
  disabled = false, size = 'md', inputWidth,
  decreaseLabel = '감소', increaseLabel = '증가',
}: Props) => {
  const [internal, setInternal] = useState(defaultValue);
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : internal;

  // wheel/keyboard 핸들러에서 최신값 참조 — listener는 mount 시 1회만 bind
  const stateRef = useRef({ value, min, max, step, disabled, isControlled });
  stateRef.current = { value, min, max, step, disabled, isControlled };

  const setClamped = (v: number) => {
    if (disabled) return;
    const clamped = Math.max(min, Math.min(max, v));
    if (!isControlled) setInternal(clamped);
    onChange?.(clamped);
  };

  // 포커스 상태일 때만 input의 휠 이벤트 가로채기 — 페이지 스크롤 방지.
  // listener는 mount 시 1회만 bind, 핸들러 안에선 stateRef로 최신값 참조.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== el) return;
      const { value, min, max, step, disabled, isControlled } = stateRef.current;
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const next = Math.max(min, Math.min(max, value + (e.deltaY < 0 ? step : -step)));
      if (!isControlled) setInternal(next);
      onChange?.(next);
      setDraft(String(next));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onChange]);

  const dim = SIZE_MAP[size];
  const inW = inputWidth ?? dim.input;
  const display = draft ?? String(value);

  return (
    <div css={s.wrap(disabled)}>
      <button css={s.btn(dim.btn)} aria-label={decreaseLabel} type="button"
        disabled={disabled || value <= min}
        onClick={() => setClamped(value - step)}>−</button>
      <input
        ref={inputRef}
        css={s.input(inW, dim.btn)}
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        value={display}
        disabled={disabled}
        aria-label={decreaseLabel === '감소' ? '값 입력' : `${decreaseLabel.replace(/감소|줄이기/, '값')}`}
        onFocus={() => setDraft(String(value))}
        onChange={e => {
          const raw = e.target.value;
          setDraft(raw);
          const v = parseInt(raw, 10);
          if (!isNaN(v)) setClamped(v);
        }}
        onBlur={() => {
          const parsed = draft === null ? NaN : parseInt(draft, 10);
          // 빈/유효하지 않은 입력 fallback:
          // - controlled: 외부 value로 복귀 (외부 store 의도 보존)
          // - uncontrolled: defaultValue로 복귀
          if (draft === '' || draft === null || isNaN(parsed)) {
            const fallback = isControlled ? (controlled as number) : defaultValue;
            setClamped(fallback);
          } else if (parsed < min || parsed > max) {
            // 입력값이 범위를 벗어남 → clamp + 안내 콜백 (keystroke가 아닌 확정 시 1회)
            const clamped = Math.max(min, Math.min(max, parsed));
            setClamped(clamped);
            onClamp?.(parsed, clamped);
          }
          setDraft(null);
        }}
      />
      <button css={s.btn(dim.btn)} aria-label={increaseLabel} type="button"
        disabled={disabled || value >= max}
        onClick={() => setClamped(value + step)}>+</button>
      {/* 스크린 리더 전용 — 값 변경 알림 */}
      <span css={s.srOnly} aria-live="polite" aria-atomic="true">{value}</span>
    </div>
  );
};

const s = {
  wrap: (disabled: boolean) => css`
    display: inline-flex; align-items: center; gap: ${spacing.xs}px;
    background: ${sem.bg.surface};
    border-radius: ${radius.lg}px;
    padding: ${spacing.xs}px;
    opacity: ${disabled ? 0.5 : 1};
  `,
  btn: (size: number) => css`
    width: ${size}px; height: ${size}px; border: none; background: transparent;
    border-radius: ${radius.md}px; cursor: pointer;
    color: ${sem.text.secondary};
    display: flex; align-items: center; justify-content: center;
    font-family: inherit; font-size: ${fontSize.lg}px; font-weight: ${fontWeight.bold};
    transition: background ${transition.fast}, color ${transition.fast};
    &:hover:not(:disabled) { background: ${sem.bg.elevated}; color: ${sem.text.primary}; }
    &:disabled { opacity: 0.4; cursor: default; }
  `,
  input: (width: number, height: number) => css`
    width: ${width}px; height: ${height}px; padding: 0 ${spacing.sm}px;
    border: none; outline: none;
    background: ${sem.surface.card}; border-radius: ${radius.md}px;
    color: ${sem.text.primary}; font-family: inherit;
    font-size: ${fontSize.md}px; font-weight: ${fontWeight.semibold};
    text-align: center;
    &:disabled { cursor: default; }
  `,
  srOnly: css`
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  `,
};
