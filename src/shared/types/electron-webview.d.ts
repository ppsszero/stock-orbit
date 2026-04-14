interface ElectronWebviewElement extends HTMLElement {
  src: string;
  executeJavaScript: (code: string) => Promise<unknown>;
  loadURL: (url: string) => void;
  addEventListener: HTMLElement['addEventListener'];
  removeEventListener: HTMLElement['removeEventListener'];
}

interface ElectronNewWindowEvent extends Event {
  url?: string;
  detail?: { url?: string };
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        allowpopups?: string;
        useragent?: string;
      },
      HTMLElement
    >;
  }
}
