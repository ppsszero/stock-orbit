import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

export const QueryErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        fallback={(error, resetError) => <ErrorFallback error={error} resetError={resetError} />}
      >
        {children}
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
