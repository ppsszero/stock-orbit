import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from './providers/QueryProvider';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
