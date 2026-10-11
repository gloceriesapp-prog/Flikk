// Single source of truth for the admin app's typeface.
//
// Was Klim "Söhne" (TEST edition — not licensed for production, legal P0),
// loaded in four width/mono variants. Replaced by Gilroy (the same family
// the customer app ships, apps/customer/assets/fonts/Gilroy-*.ttf) so the
// product unifies on one licensed typeface.
//
// Old Söhne roles → Gilroy mapping:
//   base Sohne         → Gilroy (the real app-wide default, via --font-gilroy)
//   SohneBreit (ext.)  → collapsed into Gilroy — admin is a founder-only
//   SohneSchmal (cond.)  internal tool; it never actually used the extended
//                        or condensed cuts (both were "loaded, not applied"),
//                        so there's no reason to source real Gilroy width cuts
//   SohneMono          → CSS system monospace stack (set as --font-mono in
//                        globals.css); Gilroy has no monospace cut, and
//                        `font-mono` in the pages only needs a mono fallback
//
// Gilroy ships 5 static weights (400/500/600/700/800). Lighter Söhne weights
// (200 Extraleicht / 300 Leicht) map up to 400 — nothing in admin used them.

import localFont from 'next/font/local';

// The default — applied app-wide in layout.tsx via `.variable`, consumed as
// `--font-sans` (see globals.css) and the `font-sans` Tailwind class.
export const gilroy = localFont({
  src: [
    { path: '../fonts/Gilroy-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/Gilroy-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/Gilroy-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/Gilroy-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../fonts/Gilroy-ExtraBold.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-gilroy',
  display: 'swap',
});
