// Single source of truth for Aeonik Soft Pro — every font-family name used
// anywhere in this app, and the exact file map expo-font needs to load
// them, live here. Same pattern as apps/rider's own Suisse Int'l setup and
// apps/partner's Söhne setup — copied, not shared
// (specs/00-foundation/repo-structure.md).
//
// Source files: apps/font/Aeonik Soft Pro/ (repo-root font vault) — copied
// into assets/fonts/ below. The vault ships 8 non-italic weights (Thin/
// Air/Light/Regular/Medium/SemiBold/Bold/Black); only 5 are ever actually
// referenced anywhere in this app's className/fontFamily usage (confirmed
// via a real grep across src/ — zero hits for font-thin/font-extralight/
// font-light). App.tsx's useFonts() blocks the ENTIRE app's first render
// until every file listed in AEONIK_FONT_FILES finishes loading — keeping
// three genuinely unused ~40KB OTF files in that list was pure dead
// weight on every cold start for weights nothing on screen ever uses.
// AEONIK itself still names all 8 (harmless — just string constants) in
// case a future screen wants Thin/Air/Light; add its file back to
// AEONIK_FONT_FILES the day something actually sets that className.

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
  [AEONIK.black]: require('../../assets/fonts/AeonikSoftPro-Black.otf'),
} as const;
