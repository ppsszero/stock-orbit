/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { spacing, fontSize, fontWeight, radius, transition, zIndex, opacity } from '@/shared/styles/tokens';
import { sem } from '@/shared/styles/semantic';
import { useBackAction } from '@/shared/hooks/useBackAction';
import { useOutsideClick } from '@/shared/hooks/useOutsideClick';
import { useIsDark } from '@/app/store/selectors';

/**
 * Menu — 우클릭 컨텍스트/드롭다운 메뉴 공통 컴포넌트.
 *
 * 핵심 기능:
 * - portal로 document.body 렌더 (시트 overflow:hidden 무시)
 * - 자동 위치 조정: 화면 가장자리 가까우면 위로 flip + 좌우 clamp
 * - ESC / 마우스 뒤로 / 외부 클릭 → onClose 자동
 *
 * 사용:
 *   <Menu open anchorPoint={{ x, y }} onClose={close}>
 *     <Menu.Header>그룹 옵션</Menu.Header>
 *     <Menu.Item icon={<FiEdit2 />} onClick={...}>이름 변경</Menu.Item>
 *     <Menu.Item icon={<FiTrash2 />} variant="danger" onClick={...}>삭제</Menu.Item>
 *   </Menu>
 */

interface MenuProps {
  open: boolean;
  /** 메뉴가 뜰 화면 좌표 (보통 e.clientX/Y) */
  anchorPoint: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
  /** 화면 가장자리에서 메뉴 사이 최소 여백 */
  edgePadding?: number;
}

interface MenuComponent extends React.FC<MenuProps> {
  Header: React.FC<{ children: ReactNode }>;
  Item: React.FC<MenuItemProps>;
}

const MenuBase: React.FC<MenuProps> = ({ open, anchorPoint, onClose, children, edgePadding = 8 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useBackAction(open, onClose);
  useOutsideClick(ref, open, onClose);

  // 렌더 후 측정 → 화면 안쪽으로 위치 보정
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchorPoint.x;
    let top = anchorPoint.y;
    // 우측이 화면을 넘침 → 좌측으로 밀어넣기 (anchor 기준 좌측 정렬)
    if (left + rect.width > vw - edgePadding) left = Math.max(edgePadding, vw - rect.width - edgePadding);
    if (left < edgePadding) left = edgePadding;
    // 하단이 화면을 넘침 → 위로 flip (anchor 위에 메뉴)
    if (top + rect.height > vh - edgePadding) top = Math.max(edgePadding, anchorPoint.y - rect.height);
    if (top < edgePadding) top = edgePadding;
    setPos({ left, top });
  }, [open, anchorPoint.x, anchorPoint.y, edgePadding]);

  if (!open) return null;

  // 측정 전엔 visibility hidden — 깜빡임 방지
  // portal 렌더지만 React 이벤트는 트리 기준으로 bubbling되므로 click/contextmenu 차단
  return ReactDOM.createPortal(
    <div ref={ref} css={s.menu}
      style={{
        left: pos?.left ?? anchorPoint.x,
        top: pos?.top ?? anchorPoint.y,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
};

const Header: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={s.header}>{children}</div>
);
Header.displayName = 'Menu.Header';

interface MenuItemProps {
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

const Item: React.FC<MenuItemProps> = ({ onClick, children, icon, variant = 'default', disabled = false }) => {
  // 라이트모드는 글자가 얇아 보여서 medium weight로 보정. 다크는 default(regular) 유지.
  const isDark = useIsDark();
  return (
    <button type="button" css={s.item(variant, isDark)} onClick={onClick} disabled={disabled}>
      {icon && <span css={s.itemIcon}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
Item.displayName = 'Menu.Item';

export const Menu = MenuBase as MenuComponent;
Menu.Header = Header;
Menu.Item = Item;
MenuBase.displayName = 'Menu';

const s = {
  menu: css`
    position: fixed;
    background: ${sem.surface.popover};
    border-radius: ${radius.xl}px;
    padding: ${spacing.sm}px;
    box-shadow: ${sem.shadow.popover};
    z-index: ${zIndex.modal};
    min-width: 140px;
  `,
  header: css`
    padding: ${spacing.sm}px ${spacing.lg}px ${spacing.xs}px;
    font-size: ${fontSize.xs}px; font-weight: ${fontWeight.bold};
    color: ${sem.text.tertiary};
    letter-spacing: 0.04em;
  `,
  item: (variant: 'default' | 'danger', isDark: boolean) => {
    const color = variant === 'danger' ? sem.action.danger : sem.text.primary;
    const hoverBg = variant === 'danger' ? sem.action.dangerTint : sem.bg.elevated;
    return css`
      display: flex; align-items: center; gap: ${spacing.md}px;
      width: 100%;
      padding: ${spacing.md}px ${spacing.lg}px;
      border: none; background: transparent;
      border-radius: ${radius.md}px;
      font-size: ${fontSize.md}px; font-family: inherit;
      font-weight: ${isDark ? fontWeight.normal : fontWeight.medium};
      color: ${color}; cursor: pointer;
      text-align: left;
      transition: background ${transition.fast};
      &:hover:not(:disabled) { background: ${hoverBg}; }
      &:disabled { opacity: ${opacity.disabledWeak}; cursor: default; }
    `;
  },
  itemIcon: css`
    display: inline-flex; align-items: center;
    flex-shrink: 0;
  `,
};
