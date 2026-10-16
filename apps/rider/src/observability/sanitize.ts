// Avoid transmitting phone numbers, emails, bearer credentials or query strings
// from error messages. Request bodies, user identities and breadcrumbs are dropped.
export function sanitizeErrorText(value: string): string {
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d ()-]{8,}\d/g, '[phone]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]+/g, '$1?[redacted]');
}
