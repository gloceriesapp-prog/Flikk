// Pure decision for the background-location prominent disclosure that Google
// Play requires before an app requests background location. Kept free of
// Expo imports so backgroundDisclosure.selfcheck.ts can run it under plain
// Node.
//
// Policy:
//  - Already granted ("Allow all the time")          → never show.
//  - OS can still ask                                  → show the disclosure,
//                                                        then the OS prompt.
//  - OS will no longer ask (denied permanently, or
//    Android 11+ needing the Settings page)            → show the disclosure
//                                                        with an "Open settings"
//                                                        action instead.
//  - Unknown (old dev client, Expo Go, API threw)      → never show; the app
//                                                        keeps working on the
//                                                        foreground ping alone.
//  - Rider tapped "Not now"                            → stay quiet for
//                                                        DECLINE_COOLDOWN_MS, so
//                                                        going online isn't
//                                                        nagged every time.

export type BackgroundAccess = 'granted' | 'askable' | 'settings_only' | 'unavailable';

export type DisclosureAction = 'none' | 'request' | 'open_settings';

export const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function classifyBackgroundPermission(permission: { granted: boolean; canAskAgain: boolean } | null): BackgroundAccess {
  if (!permission) return 'unavailable';
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'askable' : 'settings_only';
}

export function disclosureAction(access: BackgroundAccess, declinedAt: number | null, now: number): DisclosureAction {
  if (access === 'granted' || access === 'unavailable') return 'none';
  if (declinedAt !== null && Number.isFinite(declinedAt) && now - declinedAt < DECLINE_COOLDOWN_MS) return 'none';
  return access === 'askable' ? 'request' : 'open_settings';
}

export function parseDeclinedAt(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}
