import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { sanitizeErrorText } from './sanitize';

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
  // Keep a short breadcrumb trail (nav + lifecycle) so trace transactions have
  // context. Crash *events* still have their breadcrumbs stripped in
  // beforeSend below (PII hygiene); beforeSend does not run on transactions,
  // so navigation/perf traces keep theirs.
  maxBreadcrumbs: 50,
  beforeSend(event) {
    delete event.user;
    delete event.request;
    delete event.extra;
    delete event.breadcrumbs;
    if (event.message) event.message = sanitizeErrorText(event.message);
    for (const exception of event.exception?.values ?? []) {
      if (exception.value) exception.value = sanitizeErrorText(exception.value);
    }
    return event;
  },
});

export function captureRenderError(error: Error): void {
  Sentry.captureException(error);
}
export const withCrashReporting = Sentry.wrap;
