import { css } from '@emotion/react';
import { themeToVars } from './vars';

export const globalStyles = (colors: Record<string, any>, isDark: boolean = true) => css`
  :root {
    ${themeToVars(colors)}
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    line-height: 1;
    font-family: inherit;
  }

  html, body, #root {
    height: 100%;
    overflow: hidden;
    font-family: 'Pretendard Variable', 'Pretendard', -apple-system, 'Noto Sans KR', sans-serif;
    background: transparent;
    color: var(--c-text);
    user-select: none;
    -webkit-user-select: none;
    ${!isDark ? '-webkit-font-smoothing: antialiased;' : ''}
  }

  ${!isDark ? `
    body { font-weight: 500; }
    b, strong, [style*="font-weight: 700"], [style*="font-weight:700"] { font-weight: 800; }
  ` : ''}

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${colors.textTertiary}40; border-radius: 2px; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
`;
