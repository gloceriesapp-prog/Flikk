import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { sanitizeTelemetryEvent } from './sanitize';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// React Navigation instrumentation: records a transaction per route change
// (the actual perf signal — "which screen is slow in the field") plus
// navigation breadcrumbs. Registered with the real NavigationContainer ref in
// RootNavigator once the container is ready (navigationIntegration
// .registerNavigationContainer). Exported so that wiring stays in one place.
export const navigationIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn,
  enabled: !!dsn && !__DEV__,
  enableNative: !isRunningInExpoGo(),
  sendDefaultPii: false,
  // Function form so Sentry's default integrations (error handlers, native
  // crash, etc.) are kept and nav instrumentation is added — passing a bare
  // array would REPLACE the defaults.
  integrations: (defaults) => [...defaults, navigationIntegration],
  // Small fixed sample so field slowness (slow screens / route changes) is
  // actually visible without flooding quota. 10% of traced transactions.
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // Neither crash events nor performance transactions retain breadcrumbs,
  // customer identity, request URLs, coordinate queries or span payloads.
  maxBreadcrumbs: 0,
  beforeSend: sanitizeTelemetryEvent,
  beforeSendTransaction: sanitizeTelemetryEvent,
});

export function captureRenderError(error: Error): void {
  Sentry.captureException(error);
}
export const withCrashReporting = Sentry.wrap;
