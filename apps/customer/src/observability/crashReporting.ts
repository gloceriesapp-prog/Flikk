import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { sanitizeErrorText } from './sanitize';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn,
  enabled: !!dsn && !__DEV__,
  enableNative: !isRunningInExpoGo(),
  sendDefaultPii: false,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  maxBreadcrumbs: 0,
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
