// Avoid transmitting phone numbers, emails, bearer credentials or query strings
// from error messages. Request bodies, user identities and breadcrumbs are dropped.
export function sanitizeErrorText(value: string): string {
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d ()-]{8,}\d/g, '[phone]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]+/g, '$1?[redacted]');
}


interface TelemetryEvent {
  user?: unknown;
  request?: unknown;
  extra?: unknown;
  breadcrumbs?: unknown;
  message?: string;
  transaction?: string;
  exception?: { values?: { value?: string }[] };
  spans?: { description?: string; data?: unknown }[];
  contexts?: { trace?: { data?: unknown }; [key: string]: unknown };
}

// Both error and transaction hooks must run this filter. Network spans can
// otherwise carry delivery coordinates in URLs even with sendDefaultPii=false.
// Keep timings/status/trace IDs, but discard arbitrary network/span attributes.
export function sanitizeTelemetryEvent<T extends TelemetryEvent>(event: T): T {
  // An explicit non-user IP prevents Sentry's default server-side IP inference.
  // Never retain a customer identity previously attached by another integration.
  event.user = { ip_address: '0.0.0.0' };
  delete event.request;
  delete event.extra;
  delete event.breadcrumbs;
  if (event.message) event.message = sanitizeErrorText(event.message);
  if (event.transaction) event.transaction = sanitizeErrorText(event.transaction);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = sanitizeErrorText(exception.value);
  }
  for (const span of event.spans ?? []) {
    delete span.description;
    delete span.data;
  }
  if (event.contexts?.trace) delete event.contexts.trace.data;
  return event;
}
