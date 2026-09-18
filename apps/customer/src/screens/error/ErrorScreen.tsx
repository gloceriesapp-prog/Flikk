// TEMP root for design iteration (AppNavigator.tsx's own note) on the
// REAL crash UI — ErrorFallback.tsx, the exact component ErrorBoundary.tsx
// renders on an uncaught render error. Not a second, invented design.

import { ErrorFallback } from '../../components/ErrorFallback';

export function ErrorScreen() {
  return <ErrorFallback onReset={() => {}} />;
}
