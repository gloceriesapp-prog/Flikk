// Top-level safety net — without this, one uncaught render error anywhere
// in the tree (a bad prop from a slow API response, a null a screen didn't
// guard against) crashes the whole app to a white screen with no recovery
// and no record of what happened. Same problem apps/rider's own
// ErrorBoundary exists to catch, but that one is a dev-diagnostic tool
// (raw stack trace, no way back) — this version is the production-facing
// counterpart: log the full trace for us, show the customer something
// recoverable instead of the raw crash.
//
// "Try again" resets local state, which remounts the crashed subtree from
// scratch — the right fix for the common case (a transient bad prop from
// one bad API response), not a fix for a deterministic bug that'll throw
// again immediately. If it does throw again, the customer sees the same
// screen and can back out via the OS instead of a hard white screen either
// way, which is strictly better than what existed before.

import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    // Full trace to Metro/device logs — never rendered on screen (the
    // customer-facing fallback below is text-only), but still the real
    // record of what happened for whoever's debugging the build.
    console.error('[ErrorBoundary] caught render error:\n', error, '\ncomponentStack:', errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return <ErrorFallback onReset={this.reset} />;
  }
}
