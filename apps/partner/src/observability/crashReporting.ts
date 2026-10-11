// Crash reporting — same privacy posture as apps/customer: only the error
// itself is sent, with phone numbers, emails and tokens scrubbed out, and no
// user identity, request bodies or breadcrumbs. Off in dev and whenever
// EXPO_PUBLIC_SENTRY_DSN is unset, so a build without Sentry still runs.
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { sanitizeErrorText } from './sanitize';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn,
  enabled: !!dsn && !__DEV__,
  enableNative: !isRunningInExpoGo(),
  sendDefaultPii: false,
  // 10% performance-trace sampling (#31) — enough signal on slow transactions
  // without the full-rate overhead/quota. Still gated by `enabled` above, so
  // it's off in dev and when no DSN is set.
  tracesSampleRate: 0.1,
  // Keep a ~50-entry breadcrumb ring for crash context (#31). beforeSend still
  // strips them from the payload actually sent (privacy posture below), so this
  // only affects the in-memory trail available to local/native handling.
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

export const withCrashReporting = Sentry.wrap;
