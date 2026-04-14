import { useEffect, RefObject } from 'react';

/**
 * 요소 외부 클릭 감지 hook.
 * PresetTabs(컨텍스트메뉴), TitleBar(투명도팝업) 등에서 중복되던 패턴 통합.
 */
export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) => {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, active, onOutside]);
};
