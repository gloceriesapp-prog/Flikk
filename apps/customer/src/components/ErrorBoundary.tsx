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
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

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
    // Full trace to Metro/device logs — LogBox's own overlay crops the
    // component stack to whatever fits on screen, this doesn't.
    // eslint-disable-next-line no-console
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
      <View style={{ flex: 1, backgroundColor: colors.mist, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Something went wrong</Text>
        <Text style={{ color: colors.ink, opacity: 0.6, fontSize: 14, marginBottom: 24 }}>
          Sorry about that — you can try again, or close and reopen the app if it keeps happening.
        </Text>

        <Pressable
          onPress={this.reset}
          style={{ backgroundColor: colors.coral, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 16 }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Try again</Text>
        </Pressable>

        {/* Raw error only in dev — a customer never needs to see a stack
            trace, but a developer testing a build absolutely does. */}
        {__DEV__ ? (
          <ScrollView style={{ maxHeight: 240, borderRadius: 12, backgroundColor: colors.ink, padding: 12 }}>
            <Text style={{ color: colors.coral, fontWeight: '700', fontSize: 13, marginBottom: 8 }}>{error.message}</Text>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Courier', fontSize: 11 }}>
              {componentStack ?? 'No component stack available.'}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }
}
