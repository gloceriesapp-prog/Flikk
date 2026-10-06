function validateApiUrl(configured, development) {
  const value = typeof configured === 'string' ? configured.trim() : '';
  if (!value && development) return 'http://localhost:4000';
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error('Set EXPO_PUBLIC_API_URL to a valid API URL.'); }
  const host = parsed.hostname.toLowerCase();
  const parts = host.split('.').map(Number);
  const ipv4 = parts.length === 4 && parts.every(n => Number.isInteger(n) && n >= 0 && n <= 255);
  const local = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.includes(':') ||
    ipv4 && (parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] === 169 && parts[1] === 254 ||
    parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash ||
    !development && (parsed.protocol !== 'https:' || local)) {
    throw new Error('Release builds require an HTTPS API URL without credentials, query parameters or a local host.');
  }
  return parsed.toString().replace(/\/+$/, '');
}
module.exports = { validateApiUrl };
