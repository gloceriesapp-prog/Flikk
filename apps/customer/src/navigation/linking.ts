// Deep links: gloceries://home, gloceries://order/<uuid>[?trip=1],
// gloceries://store/<uuid>. Hand-parsed instead of React Navigation's path
// config so every param is validated — an unknown path or malformed id opens
// nothing (returns undefined) rather than a screen with garbage params.
// Ownership is still enforced server-side when TrackOrder fetches the order.
// Push taps keep their own stricter path (features/notifications/navigation.ts:
// customer-id match + fetch-before-navigate), so they don't route through here.
import type { LinkingOptions, PartialState, NavigationState } from '@react-navigation/native';
import type { AppStackParamList } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LinkState = PartialState<NavigationState<AppStackParamList>>;

export function stateFromDeepLink(path: string): LinkState | undefined {
  const [pathname = '', query = ''] = path.replace(/^\/+/, '').split('?');
  const [screen, id, ...rest] = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (rest.length) return undefined;
  const params = new URLSearchParams(query);
  const home = { name: 'Home' as const };
  if ((screen === 'home' || screen === undefined) && !id) return { routes: [home] };
  if (!id || !UUID.test(id)) return undefined;
  if (screen === 'order') {
    return { routes: [home, { name: 'TrackOrder', params: { orderId: id, isTrip: params.get('trip') === '1', paymentMethodLabel: '' } }] };
  }
  if (screen === 'store') {
    return { routes: [home, { name: 'StoreDetail', params: { storeId: id, storeName: 'Store' } }] };
  }
  return undefined;
}

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['gloceries://'],
  getStateFromPath: (path) => {
    try { return stateFromDeepLink(path); } catch { return undefined; } // malformed %-escapes
  },
};
