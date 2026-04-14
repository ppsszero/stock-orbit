/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string;
  export default src;
}

// Electron webview 태그 타입 선언
interface ElectronWebviewHTMLAttributes extends React.HTMLAttributes<HTMLElement> {
  src?: string;
  useragent?: string;
  partition?: string;
  preload?: string;
  nodeintegration?: string;
  disablewebsecurity?: string;
  allowpopups?: string;
  httpreferrer?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: ElectronWebviewHTMLAttributes;
    }
  }
}
