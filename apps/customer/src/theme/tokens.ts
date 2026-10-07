// Source of truth: specs/00-foundation/design-system.md
// Copied (not npm-linked) into each of the 3 RN apps — see specs/00-foundation/repo-structure.md
// on why /packages/shared doesn't exist yet.

export const colors = {
  lime: '#A8D93A',
  limeDeep: '#7CB518',
  limeSoft: '#EEF7DC',
  ink: '#101C10',
  coral: '#FF6B4A',
  gold: '#FFD700',
  mist: '#F6FAF0',
  success: '#2E9E77',
  danger: '#D64545',
  whiteOG: '#f7f8f6',
  pink: '#FF69B4',
  blue: '#007BFF',
} as const;

export const spacing = (multiplier: number) => multiplier * 4;

export const radius = {
  card: 16,
  button: 13,
} as const;

// Font: Gilroy only — loaded in App.tsx (theme/fonts.ts) and applied to every
// Text globally by global.css. No system-font fallback token on purpose.

export const minTouchTarget = 44;
