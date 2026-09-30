// Single source of truth for Gilroy — every font-family name used anywhere
// in this app, and the exact file map expo-font needs to load them, live
// here. Same copied-not-shared pattern as the other apps' font setups
// (specs/00-foundation/repo-structure.md).
//
// Source files: apps/font/Gilroy-Font-Family/ (repo-root font vault), copied
// into assets/fonts/ below. Gilroy ships the full static weight range, so —
// unlike the prior Circular/Avenir/Satoshi setups — every Tailwind step the
// app uses has its OWN real face, no aliasing: Regular/Medium/SemiBold/Bold/
// ExtraBold/Black. App.tsx's useFonts() blocks first render until every file
// in GILROY_FONT_FILES loads, so only the faces the app references are listed
// (the vault's lighter weights + all italics are left unregistered — YAGNI).
//
// ponytail: only the 6 weights the app actually uses are registered. Add
// Thin/Light/etc. here + in global.css the day a screen needs one.

export const GILROY = {
  regular: 'Gilroy-Regular',
  medium: 'Gilroy-Medium',
  semibold: 'Gilroy-SemiBold',
  bold: 'Gilroy-Bold',
  extrabold: 'Gilroy-ExtraBold',
  black: 'Gilroy-Black',
} as const;

export const GILROY_FONT_FILES = {
  [GILROY.regular]: require('../../assets/fonts/Gilroy-Regular.ttf'),
  [GILROY.medium]: require('../../assets/fonts/Gilroy-Medium.ttf'),
  [GILROY.semibold]: require('../../assets/fonts/Gilroy-SemiBold.ttf'),
  [GILROY.bold]: require('../../assets/fonts/Gilroy-Bold.ttf'),
  [GILROY.extrabold]: require('../../assets/fonts/Gilroy-ExtraBold.ttf'),
  [GILROY.black]: require('../../assets/fonts/Gilroy-Black.ttf'),
} as const;
