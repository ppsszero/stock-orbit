/**
 * KeyboardEvent에서 단축키 문자열을 생성하는 순수 함수.
 * useScreenshot(매칭)과 useShortcutCapture(캡처) 양쪽에서 동일한 규칙을 공유.
 */
export const parseShortcut = (e: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; key: string }): string => {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  parts.push(key);

  return parts.join('+');
};

/** modifier만 단독 입력인지 판별 */
export const isModifierOnly = (key: string): boolean =>
  ['Control', 'Shift', 'Alt', 'Meta'].includes(key);
