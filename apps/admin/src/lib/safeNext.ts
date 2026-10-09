const FALLBACK = '/overview';
const LOCAL_ORIGIN = 'https://admin.invalid';

/** Accept only local dashboard destinations, never executable or foreign URLs. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || value.length > 2048 || !value.startsWith('/') || /[\\\u0000-\u0020\u007f]/.test(value)) return FALLBACK;
  try {
    // Reject encoded slashes/backslashes and control characters as well: a
    // downstream proxy or browser may normalize them before navigation.
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return FALLBACK;
    const url = new URL(value, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN || ['/login', '/auth', '/api'].some(path => url.pathname === path || url.pathname.startsWith(`${path}/`))) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return FALLBACK; }
}
