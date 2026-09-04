// Source of truth: specs/00-foundation/design-system.md
// Copied (not npm-linked) into each of the 3 RN apps — see specs/00-foundation/repo-structure.md
// on why /packages/shared doesn't exist yet.

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
  whiteOG: '#f7f8f6',
  pink: '#FF69B4',
} as const;

export const spacing = (multiplier: number) => multiplier * 4;

export const radius = {
  card: 16,
  button: 13,
} as const;

// System font stack only — no custom webfont/font file bundled in any app.
// Deliberate load-time call for 3G, per design-system.md. RN already defaults
// to the platform system font with no fontFamily set; this makes the choice
// explicit and named rather than relying on an unstated default.
//   iOS      -> San Francisco ("System")
//   Android  -> Roboto ("Roboto", RN/Android's actual system default)
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const fontWeight = {
  regular: '400' as const,
  medium: '600' as const,
  display: '800' as const, // headings, prices — tight tracking per design-system.md
};

export const typography = {
  fontFamily,
  displayWeight: fontWeight.display,
  // apply to every price/ETA/earnings figure — prevents horizontal jitter as digits update
  tabularNums: { fontVariant: ['tabular-nums'] as const },
};

export const minTouchTarget = 44;
