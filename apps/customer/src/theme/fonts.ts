// Single source of truth for Söhne — every font-family name used anywhere
// in the app, and the exact file map expo-font needs to load them, live
// here. Same convention as apps/admin and apps/partner's own Söhne setup —
// this is genuinely the same font, "copied not shared" per this repo's
// own convention (specs/00-foundation/repo-structure.md), not cross-
// imported. Italic (Kursiv) intentionally excluded, per standing
// instruction applied identically across every app that's adopted Söhne
// this way.
//
// Söhne only ships 8 real weights (German naming, lightest to heaviest);
// Tailwind's 9 numeric font-weight utilities collapse onto them —
// font-thin and font-extralight both resolve to Extraleicht, see
// global.css's own mapping. Screens that need a specific weight face
// directly can import SOHNE and set style={{ fontFamily: SOHNE.kraftig }};
// everything else gets Söhne for free via the global Text/TextInput
// default set in global.css.

export const SOHNE = {
  extraleicht: 'Sohne-Extraleicht', // 200
  leicht: 'Sohne-Leicht', // 300
  buch: 'Sohne-Buch', // 400 — regular/body weight
  kraftig: 'Sohne-Kraftig', // 500
  halbfett: 'Sohne-Halbfett', // 600
  dreiviertelfett: 'Sohne-Dreiviertelfett', // 700
  fett: 'Sohne-Fett', // 800
  extrafett: 'Sohne-Extrafett', // 900
} as const;

export const SOHNE_FONT_FILES = {
  [SOHNE.extraleicht]: require('../../assets/fonts/Sohne-Extraleicht.otf'),
  [SOHNE.leicht]: require('../../assets/fonts/Sohne-Leicht.otf'),
  [SOHNE.buch]: require('../../assets/fonts/Sohne-Buch.otf'),
  [SOHNE.kraftig]: require('../../assets/fonts/Sohne-Kraftig.otf'),
  [SOHNE.halbfett]: require('../../assets/fonts/Sohne-Halbfett.otf'),
  [SOHNE.dreiviertelfett]: require('../../assets/fonts/Sohne-Dreiviertelfett.otf'),
  [SOHNE.fett]: require('../../assets/fonts/Sohne-Fett.otf'),
  [SOHNE.extrafett]: require('../../assets/fonts/Sohne-Extrafett.otf'),
} as const;
