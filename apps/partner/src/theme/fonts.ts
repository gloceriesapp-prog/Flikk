// Single source of truth for Söhne — every font-family name used anywhere
// in this app, and the exact file map expo-font needs to load them, live
// here. Same pattern as apps/customer/src/theme/fonts.ts's Gilroy setup,
// copied not shared (see specs/00-foundation/repo-structure.md).
//
// All 4 family widths (Sohne/regular, SohneBreit/extended, SohneMono/
// monospace, SohneSchmal/condensed) × all 8 weights are loaded — "import
// every font" per the ask — but only base Sohne is wired as the app-wide
// default (see global.css's weight-utility mapping). Breit/Mono/Schmal are
// loaded and available for a screen that wants to opt into one explicitly
// via SOHNE.breit.*, .mono.*, .schmal.* — none currently does.
//
// Italics excluded entirely, per the ask — Söhne's own naming calls them
// "Kursiv"; none of those files were copied into assets/fonts/.
//
// German weight names, kept as-is rather than translated — Extraleicht
// (~200), Leicht (~300), Buch ("book", ~400 — the family's roman/regular),
// Kraftig ("vigorous", ~500), Halbfett ("semi-bold", ~600), Dreiviertelfett
// ("three-quarter-bold", ~700), Fett ("bold", ~800), Extrafett (~900).

export const SOHNE = {
  extraleicht: 'Sohne-Extraleicht',
  leicht: 'Sohne-Leicht',
  buch: 'Sohne-Buch',
  kraftig: 'Sohne-Kraftig',
  halbfett: 'Sohne-Halbfett',
  dreiviertelfett: 'Sohne-Dreiviertelfett',
  fett: 'Sohne-Fett',
  extrafett: 'Sohne-Extrafett',

  breit: {
    extraleicht: 'SohneBreit-Extraleicht',
    leicht: 'SohneBreit-Leicht',
    buch: 'SohneBreit-Buch',
    kraftig: 'SohneBreit-Kraftig',
    halbfett: 'SohneBreit-Halbfett',
    dreiviertelfett: 'SohneBreit-Dreiviertelfett',
    fett: 'SohneBreit-Fett',
    extrafett: 'SohneBreit-Extrafett',
  },

  mono: {
    extraleicht: 'SohneMono-Extraleicht',
    leicht: 'SohneMono-Leicht',
    buch: 'SohneMono-Buch',
    kraftig: 'SohneMono-Kraftig',
    halbfett: 'SohneMono-Halbfett',
    dreiviertelfett: 'SohneMono-Dreiviertelfett',
    fett: 'SohneMono-Fett',
    extrafett: 'SohneMono-Extrafett',
  },

  schmal: {
    extraleicht: 'SohneSchmal-Extraleicht',
    leicht: 'SohneSchmal-Leicht',
    buch: 'SohneSchmal-Buch',
    kraftig: 'SohneSchmal-Kraftig',
    halbfett: 'SohneSchmal-Halbfett',
    dreiviertelfett: 'SohneSchmal-Dreiviertelfett',
    fett: 'SohneSchmal-Fett',
    extrafett: 'SohneSchmal-Extrafett',
  },
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

  [SOHNE.breit.extraleicht]: require('../../assets/fonts/SohneBreit-Extraleicht.otf'),
  [SOHNE.breit.leicht]: require('../../assets/fonts/SohneBreit-Leicht.otf'),
  [SOHNE.breit.buch]: require('../../assets/fonts/SohneBreit-Buch.otf'),
  [SOHNE.breit.kraftig]: require('../../assets/fonts/SohneBreit-Kraftig.otf'),
  [SOHNE.breit.halbfett]: require('../../assets/fonts/SohneBreit-Halbfett.otf'),
  [SOHNE.breit.dreiviertelfett]: require('../../assets/fonts/SohneBreit-Dreiviertelfett.otf'),
  [SOHNE.breit.fett]: require('../../assets/fonts/SohneBreit-Fett.otf'),
  [SOHNE.breit.extrafett]: require('../../assets/fonts/SohneBreit-Extrafett.otf'),

  [SOHNE.mono.extraleicht]: require('../../assets/fonts/SohneMono-Extraleicht.otf'),
  [SOHNE.mono.leicht]: require('../../assets/fonts/SohneMono-Leicht.otf'),
  [SOHNE.mono.buch]: require('../../assets/fonts/SohneMono-Buch.otf'),
  [SOHNE.mono.kraftig]: require('../../assets/fonts/SohneMono-Kraftig.otf'),
  [SOHNE.mono.halbfett]: require('../../assets/fonts/SohneMono-Halbfett.otf'),
  [SOHNE.mono.dreiviertelfett]: require('../../assets/fonts/SohneMono-Dreiviertelfett.otf'),
  [SOHNE.mono.fett]: require('../../assets/fonts/SohneMono-Fett.otf'),
  [SOHNE.mono.extrafett]: require('../../assets/fonts/SohneMono-Extrafett.otf'),

  [SOHNE.schmal.extraleicht]: require('../../assets/fonts/SohneSchmal-Extraleicht.otf'),
  [SOHNE.schmal.leicht]: require('../../assets/fonts/SohneSchmal-Leicht.otf'),
  [SOHNE.schmal.buch]: require('../../assets/fonts/SohneSchmal-Buch.otf'),
  [SOHNE.schmal.kraftig]: require('../../assets/fonts/SohneSchmal-Kraftig.otf'),
  [SOHNE.schmal.halbfett]: require('../../assets/fonts/SohneSchmal-Halbfett.otf'),
  [SOHNE.schmal.dreiviertelfett]: require('../../assets/fonts/SohneSchmal-Dreiviertelfett.otf'),
  [SOHNE.schmal.fett]: require('../../assets/fonts/SohneSchmal-Fett.otf'),
  [SOHNE.schmal.extrafett]: require('../../assets/fonts/SohneSchmal-Extrafett.otf'),
} as const;
