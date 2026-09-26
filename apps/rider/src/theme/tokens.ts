// Source of truth: specs/00-foundation/design-system.md (also mirrored in
// tailwind.config.js — keep both in sync by hand, see that file's own
// note). Same brand palette as apps/customer/apps/partner, system font
// stack (no custom webfont) per CLAUDE.md's own default for this app.

import { Platform } from 'react-native';

export const colors = {
  lime: '#A8D93A',
  limeDeep: '#7CB518',
  limeSoft: '#EEF7DC',
  ink: '#101C10',
  coral: '#FF6B4A',
  gold: '#D9A441',
  mist: '#F6FAF0',
  success: '#2E9E77',
  danger: '#D64545',
  // Surge-pay only — distinct from lime on purpose, since lime already
  // means "online/active status" everywhere else in this app. Matches
  // the amber real rider apps (Uber/Rapido/Ola) use for surge, so it
  // reads as "extra money" on sight rather than a random new hue.
  surge: '#fe9a00',
  surgeSoft: '#fef3c6',
} as const;

export const radius = {
  card: 16,
  button: 13,
} as const;

// Real cross-platform box shadow. NativeWind's `shadow-*` classes only emit
// the iOS shadow props — they set NO Android `elevation`, so a white box with
// just `shadow-md` renders dead flat on Android (why BottomNavBar/IosSwitch
// set elevation by hand). These presets carry both: use via style={} on any
// floating white surface (map-screen chips, bottom sheets) so the "box" reads
// on both platforms. `chip` = small floating pill/button; `sheet` = the big
// bottom sheet that lifts off the map.
export const shadow = {
  chip: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 5 },
    default: {},
  }),
  sheet: Platform.select({
    ios: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: -4 } },
    android: { elevation: 20 },
    default: {},
  }),
} as const;

export const minTouchTarget = 44;
