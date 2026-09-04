// Diagnostic aid for the "Couldn't find a navigation context" crash on
// Earnings' Withdraw tab — the in-app error overlay's Component Stack gets
// cropped by however much fits on screen/in a screenshot; this logs the
// FULL error + componentStack to the Metro terminal via console.error
// (which Expo's LogBox doesn't truncate the same way), so the next repro
// gives a complete, unambiguous trace instead of a 3-line crop. Also
// renders a scrollable on-screen fallback with the same full text, in
// case the terminal isn't handy.

import { Component, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

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
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught render error:\n', error, '\ncomponentStack:', errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#101C10' }} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
          <Text style={{ color: '#FF6B4A', fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>
            {this.state.error.message}
          </Text>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Courier', fontSize: 12 }}>
            {this.state.componentStack ?? 'No component stack available.'}
          </Text>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}
