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
    /* halation 보정: 다크는 antialiased(얇게)로 흰 글자 번짐 억제,
       라이트는 subpixel(auto)로 글자 두께 살림 */
    -webkit-font-smoothing: ${isDark ? 'antialiased' : 'auto'};
    -moz-osx-font-smoothing: ${isDark ? 'grayscale' : 'auto'};
  }

  ${!isDark ? `
    /* 라이트 halation 보정:
       1) 명시적 weight 없는 기본 텍스트 두께 +100
       2) text-shadow trick — currentColor로 글리프 외곽 0.5px 번지게 해서
          명시적 font-weight 무관하게 모든 텍스트에 두께감 부여 (inherit으로 전파) */
    body {
      font-weight: 500;
      text-shadow: 0 0 0.5px currentColor;
    }
  ` : ''}

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${colors.textTertiary}40; border-radius: 2px; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
`;
