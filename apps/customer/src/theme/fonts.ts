// Single source of truth for Suisse Int'l — every font-family name used
// anywhere in this app, and the exact file map expo-font needs to load
// them, live here. Same pattern as apps/rider's own Suisse Int'l setup and
// apps/partner's Söhne setup — copied, not shared
// (specs/00-foundation/repo-structure.md).
//
// Source files: apps/font/SuisseInt/ (repo-root font vault) — copied into
// assets/fonts/ below, same as every sibling app copies its own font
// vault in rather than requiring across app boundaries. Only 4 faces
// exist (Thin/Light/Regular/SemiBold — no Bold/Black cut) — global.css's
// font-weight-utility mapping caps every Tailwind weight utility at
// SemiBold, the heaviest face actually available.

export const SUISSE = {
  thin: 'SuisseIntl-Thin',
  light: 'SuisseIntl-Light',
  regular: 'SuisseIntl-Regular',
  semiBold: 'SuisseIntl-SemiBold',
} as const;

export const SUISSE_FONT_FILES = {
  [SUISSE.thin]: require('../../assets/fonts/SuisseIntl-Thin.otf'),
  [SUISSE.light]: require('../../assets/fonts/SuisseIntl-Light.otf'),
  [SUISSE.regular]: require('../../assets/fonts/SuisseIntl-Regular.otf'),
  [SUISSE.semiBold]: require('../../assets/fonts/SuisseIntl-SemiBold.otf'),
} as const;
