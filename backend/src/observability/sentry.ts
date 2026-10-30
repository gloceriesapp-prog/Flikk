// Backend error reporting to Sentry (API and worker). Off unless SENTRY_DSN is
// set, so local runs and tests never send anything.
//
// Errors arrive two ways: uncaught exceptions/unhandled rejections (Sentry's
// default integrations), and every logger.error/fatal that carries an `err`
// (lib/logger.ts hook) — that one place covers 500s from errorHandler and
// failed worker jobs alike. No request bodies, headers, users or IPs are sent,
// and phone numbers/emails are masked out of messages, same rule as the logs.
import * as Sentry from '@sentry/node';

let enabled = false;

const PHONE = /\+?\d[\d\s-]{8,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
export const scrub = (text: string) => text.replace(EMAIL, '[email]').replace(PHONE, '[number]');

export function initSentry(role: 'api' | 'worker') {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || enabled) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.RELEASE_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    initialScope: { tags: { role } },
    beforeSend(event) {
      delete event.request;
      delete event.user;
      delete event.server_name;
      if (event.message) event.message = scrub(event.message);
      for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrub(ex.value);
      return event;
    },
  });
  enabled = true;
}

/** Called by the logger for error/fatal lines that carry an error. */
export function reportError(err: unknown, message?: string) {
  if (!enabled) return;
  Sentry.captureException(err, message ? { extra: { log: scrub(message) } } : undefined);
}

export async function flushSentry() {
  if (enabled) await Sentry.flush(2000);
}
