// Source of truth: specs/00-foundation/design-system.md
// Copied (not npm-linked) into each of the 3 RN apps — see specs/00-foundation/repo-structure.md
// on why /packages/shared doesn't exist yet.

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
} as const;

export const spacing = (multiplier: number) => multiplier * 4;

export const radius = {
  card: 16,
  button: 13,
} as const;

// Söhne (base weight, "Buch") app-wide — see ./fonts.ts for the full weight
// map and global.css for how it's actually applied (NativeWind's CSS
// engine, not this constant — nothing in this app reads `fontFamily`
// directly, same as apps/customer's own Gilroy setup). Deliberate
// departure from design-system.md's system-font-stack default, per an
// explicit ask that this app "strictly use that font only."
export const fontFamily = 'Sohne-Buch';

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
