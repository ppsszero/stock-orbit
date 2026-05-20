/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { forwardRef } from 'react';

interface Props {
  src: string;
  className?: string;
  allowpopups?: boolean;
  useragent?: string;
}

const DEFAULT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';

// <webview>는 Electron 전용 태그라 React.Ref<HTMLElement>로만 받음.
// ElectronWebviewElement 캐스팅을 이 한 곳에 격리해 사용처에서 타입 오염 없이 ref 쓰게 함.
export const ElectronWebView = forwardRef<ElectronWebviewElement, Props>(
  ({ src, className, allowpopups = true, useragent = DEFAULT_UA }, ref) => (
    <webview
      ref={ref as React.Ref<HTMLElement>}
      src={src}
      className={className}
      css={baseCss}
      allowpopups={allowpopups ? 'true' : undefined}
      useragent={useragent}
    />
  )
);

ElectronWebView.displayName = 'ElectronWebView';

const baseCss = css`flex: 1; border: none;`;
