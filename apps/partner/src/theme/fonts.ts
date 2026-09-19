// Single source of truth for Aeonik Soft Pro — every font-family name used
// anywhere in this app, and the exact file map expo-font needs to load
// them, live here. Same pattern as apps/customer/src/theme/fonts.ts's own
// Aeonik setup, copied not shared (see specs/00-foundation/repo-structure.md).
//
// Source files: apps/font/Aeonik Soft Pro/ (repo-root font vault) — copied
// into assets/fonts/ below. The vault ships 8 non-italic weights (Thin/
// Air/Light/Regular/Medium/SemiBold/Bold/Black); only 4 are ever actually
// referenced anywhere in this app's className usage (confirmed via a real
// grep across src/ — zero hits for font-thin/font-extralight/font-light/
// font-extrabold/font-black). App.tsx's useFonts() blocks the ENTIRE app's
// first render until every file listed in AEONIK_FONT_FILES finishes
// loading — keeping four genuinely unused OTF files in that list was pure
// dead weight on every cold start for weights nothing on screen ever uses
// (same real dead-weight fix already applied to apps/customer/src/theme/
// fonts.ts). AEONIK itself still names all 8 (harmless — just string
// constants) in case a future screen wants one of the unused weights; add
// its file back to AEONIK_FONT_FILES the day something actually sets that
// className.

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
  [AEONIK.regular]: require('../../assets/fonts/AeonikSoftPro-Regular.otf'),
  [AEONIK.medium]: require('../../assets/fonts/AeonikSoftPro-Medium.otf'),
  [AEONIK.semiBold]: require('../../assets/fonts/AeonikSoftPro-SemiBold.otf'),
  [AEONIK.bold]: require('../../assets/fonts/AeonikSoftPro-Bold.otf'),
} as const;
