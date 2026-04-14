import { useState, useCallback } from 'react';
import { parseShortcut, isModifierOnly } from '../utils/parseShortcut';

/**
 * 단축키 입력 캡처 훅.
 * input의 onKeyDown에 연결하여 눌린 키 조합을 문자열로 반환.
 * onChange 콜백으로 캡처 즉시 부모에 전달 (blur 의존 제거).
 */
export const useShortcutCapture = (initial: string, onChange: (shortcut: string) => void) => {
  const [shortcut, setShortcut] = useState(initial);
  const [capturing, setCapturing] = useState(false);

  const startCapture = useCallback(() => setCapturing(true), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();

    if (isModifierOnly(e.key)) return;

    const parsed = parseShortcut(e);
    setShortcut(parsed);
    setCapturing(false);
    onChange(parsed);
  }, [capturing, onChange]);

  const handleBlur = useCallback(() => setCapturing(false), []);

  return { shortcut, capturing, startCapture, handleKeyDown, handleBlur };
};
