// Single source of truth for the app font — every font-family name used
// anywhere in this app, and the exact file map expo-font needs to load
// them, live here. Same copied-not-shared pattern as apps/customer and
// apps/partner (specs/00-foundation/repo-structure.md).
//
// Font is Gilroy (apps/customer/assets/fonts/Gilroy-*.ttf, copied in),
// unified across all apps per user decision. The prior Aeonik Soft Pro
// faces were TRIAL-licensed ("All Rights Reserved", internal name
// AeonikSoftProTRIAL) and have been removed — do not reintroduce them.
//
// The exported symbol names (AEONIK, AEONIK_FONT_FILES) and the 8 weight
// keys are kept deliberately UNCHANGED so no call site, App.tsx useFonts,
// or global.css class churns — only the family-name string values and the
// loaded files switched to Gilroy. Gilroy ships 5 static weights, so the 8
// keys collapse onto them (see mapping below); AEONIK_FONT_FILES registers
// each of the 5 real faces exactly once, and the aliased lighter keys reuse
// the already-registered 'Gilroy-Regular' name.
//
// 8 key -> Gilroy face mapping:
//   thin / air / light / regular -> Gilroy-Regular (Gilroy has no face lighter than Regular)
//   medium                        -> Gilroy-Medium
//   semiBold                      -> Gilroy-SemiBold
//   bold                          -> Gilroy-Bold
//   black                         -> Gilroy-ExtraBold (heaviest Gilroy static)

export const AEONIK = {
  thin: 'Gilroy-Regular',
  air: 'Gilroy-Regular',
  light: 'Gilroy-Regular',
  regular: 'Gilroy-Regular',
  medium: 'Gilroy-Medium',
  semiBold: 'Gilroy-SemiBold',
  bold: 'Gilroy-Bold',
  black: 'Gilroy-ExtraBold',
} as const;

export const AEONIK_FONT_FILES = {
  [AEONIK.regular]: require('../../assets/fonts/Gilroy-Regular.ttf'),
  [AEONIK.medium]: require('../../assets/fonts/Gilroy-Medium.ttf'),
  [AEONIK.semiBold]: require('../../assets/fonts/Gilroy-SemiBold.ttf'),
  [AEONIK.bold]: require('../../assets/fonts/Gilroy-Bold.ttf'),
  [AEONIK.black]: require('../../assets/fonts/Gilroy-ExtraBold.ttf'),
} as const;
