// Top-level safety net for render errors. Riders only ever see a calm,
// recoverable screen; the raw message and component stack are logged to the
// device console in every build and shown on screen only in development
// builds (__DEV__), where they are the fastest way to debug a crash.
//
// "Try again" clears the error, which remounts the crashed subtree from
// scratch. That recovers the common case (one bad API response feeding a
// screen a null it didn't guard against). A deterministic bug will throw
// again and land back here, which is still better than a white screen: the
// rider can call support from this screen without restarting the app.

import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    console.error('[ErrorBoundary] caught render error:\n', error, '\ncomponentStack:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  reset = () => {
    this.setState({ error: null, componentStack: null });
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <ErrorFallback
        onReset={this.reset}
        debugDetails={__DEV__ ? `${error.message}\n\n${componentStack ?? 'No component stack available.'}` : null}
      />
    );
  }
}
