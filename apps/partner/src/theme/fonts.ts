// Single source of truth for Aeonik Soft Pro — every font-family name used
// anywhere in this app, and the exact file map expo-font needs to load
// them, live here. Same pattern as apps/customer/src/theme/fonts.ts's own
// Aeonik setup, copied not shared (see specs/00-foundation/repo-structure.md).
//
// Source files: apps/font/Aeonik Soft Pro/ (repo-root font vault) — copied
// into assets/fonts/ below, same as customer's own copy. All 8 non-italic
// weights the vault ships (Thin/Air/Light/Regular/Medium/SemiBold/Bold/
// Black) — italics dropped entirely, matching customer's own convention;
// nothing in this app sets fontStyle: 'italic' so there's no gap to fill.

export const AEONIK = {
  thin: 'AeonikSoftPro-Thin',
  air: 'AeonikSoftPro-Air',
  light: 'AeonikSoftPro-Light',
  regular: 'AeonikSoftPro-Regular',
  medium: 'AeonikSoftPro-Medium',
  semiBold: 'AeonikSoftPro-SemiBold',
  bold: 'AeonikSoftPro-Bold',
  black: 'AeonikSoftPro-Black',
} as const;

export const AEONIK_FONT_FILES = {
  [AEONIK.thin]: require('../../assets/fonts/AeonikSoftPro-Thin.otf'),
  [AEONIK.air]: require('../../assets/fonts/AeonikSoftPro-Air.otf'),
  [AEONIK.light]: require('../../assets/fonts/AeonikSoftPro-Light.otf'),
  [AEONIK.regular]: require('../../assets/fonts/AeonikSoftPro-Regular.otf'),
  [AEONIK.medium]: require('../../assets/fonts/AeonikSoftPro-Medium.otf'),
  [AEONIK.semiBold]: require('../../assets/fonts/AeonikSoftPro-SemiBold.otf'),
  [AEONIK.bold]: require('../../assets/fonts/AeonikSoftPro-Bold.otf'),
  [AEONIK.black]: require('../../assets/fonts/AeonikSoftPro-Black.otf'),
} as const;
