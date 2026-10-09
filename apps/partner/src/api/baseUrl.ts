import { validateApiUrl } from '../../../../packages/shared/config/api-url.cjs';
import Constants from 'expo-constants';

function isLocalHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

// Development with Metro and Express on the same computer: keep the configured
// port/path, but follow Metro's LAN host after Wi-Fi IP changes (on by default
// here; EXPO_PUBLIC_API_FOLLOW_METRO_HOST=false turns it off). Hosted APIs,
// tunnel hosts and release builds always keep their explicit URL. Same logic
// as apps/customer/src/api/baseUrl.ts.
export function resolveApiBaseUrl(
  configuredUrl: string,
  metroHostUri: string | undefined,
  followMetroHost: boolean,
): string {
  const base = configuredUrl.trim().replace(/\/+$/, '');
  if (!followMetroHost || !metroHostUri) return base;
  try {
    const api = new URL(base);
    const metro = new URL(metroHostUri.includes('://') ? metroHostUri : `http://${metroHostUri}`);
    if (api.protocol !== 'http:' || !isLocalHost(api.hostname) || !isLocalHost(metro.hostname)) return base;
    api.hostname = metro.hostname;
    return api.toString().replace(/\/+$/, '');
  } catch {
    return base;
  }
}

export const API_BASE_URL = resolveApiBaseUrl(
  validateApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__),
  Constants.expoConfig?.hostUri,
  __DEV__ && process.env.EXPO_PUBLIC_API_FOLLOW_METRO_HOST !== 'false',
);
