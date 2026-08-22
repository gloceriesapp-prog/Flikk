// Single source of truth for Söhne in this app — same ask, same pattern as
// apps/partner/src/theme/fonts.ts's expo-font setup: all 4 family widths
// (Sohne/regular, SohneBreit/extended, SohneMono/monospace, SohneSchmal/
// condensed) × all 8 weights loaded ("import everything" per the ask),
// but only base Sohne is wired as the page-wide default (see
// app/layout.tsx). Breit/Mono/Schmal are loaded and available via their
// own CSS variables for anything that wants to opt in explicitly — nothing
// currently does.
//
// Italics excluded entirely, per the ask — Söhne's own naming calls them
// "Kursiv"; none of those files were copied into src/fonts/.
//
// German weight names, kept as-is rather than translated — Extraleicht
// (200), Leicht (300), Buch ("book", 400 — the family's roman/regular),
// Kraftig ("vigorous", 500), Halbfett ("semi-bold", 600), Dreiviertelfett
// ("three-quarter-bold", 700), Fett ("bold", 800), Extrafett (900).
//
// next/font/local requires `src` as a literal array at each call site
// (it's statically analyzed at build time, not a value a helper function
// can return) — that's why the same 8-weight list is written out 4 times
// below instead of factored into one shared array-builder.

import localFont from 'next/font/local';

// The default — applied app-wide in layout.tsx.
export const sohne = localFont({
  src: [
    { path: '../fonts/Sohne-Extraleicht.otf', weight: '200', style: 'normal' },
    { path: '../fonts/Sohne-Leicht.otf', weight: '300', style: 'normal' },
    { path: '../fonts/Sohne-Buch.otf', weight: '400', style: 'normal' },
    { path: '../fonts/Sohne-Kraftig.otf', weight: '500', style: 'normal' },
    { path: '../fonts/Sohne-Halbfett.otf', weight: '600', style: 'normal' },
    { path: '../fonts/Sohne-Dreiviertelfett.otf', weight: '700', style: 'normal' },
    { path: '../fonts/Sohne-Fett.otf', weight: '800', style: 'normal' },
    { path: '../fonts/Sohne-Extrafett.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-sohne',
  display: 'swap',
});

// Loaded, not currently applied anywhere — available via var(--font-sohne-breit).
export const sohneBreit = localFont({
  src: [
    { path: '../fonts/SohneBreit-Extraleicht.otf', weight: '200', style: 'normal' },
    { path: '../fonts/SohneBreit-Leicht.otf', weight: '300', style: 'normal' },
    { path: '../fonts/SohneBreit-Buch.otf', weight: '400', style: 'normal' },
    { path: '../fonts/SohneBreit-Kraftig.otf', weight: '500', style: 'normal' },
    { path: '../fonts/SohneBreit-Halbfett.otf', weight: '600', style: 'normal' },
    { path: '../fonts/SohneBreit-Dreiviertelfett.otf', weight: '700', style: 'normal' },
    { path: '../fonts/SohneBreit-Fett.otf', weight: '800', style: 'normal' },
    { path: '../fonts/SohneBreit-Extrafett.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-sohne-breit',
  display: 'swap',
});

// Loaded, not currently applied anywhere — available via var(--font-sohne-mono).
export const sohneMono = localFont({
  src: [
    { path: '../fonts/SohneMono-Extraleicht.otf', weight: '200', style: 'normal' },
    { path: '../fonts/SohneMono-Leicht.otf', weight: '300', style: 'normal' },
    { path: '../fonts/SohneMono-Buch.otf', weight: '400', style: 'normal' },
    { path: '../fonts/SohneMono-Kraftig.otf', weight: '500', style: 'normal' },
    { path: '../fonts/SohneMono-Halbfett.otf', weight: '600', style: 'normal' },
    { path: '../fonts/SohneMono-Dreiviertelfett.otf', weight: '700', style: 'normal' },
    { path: '../fonts/SohneMono-Fett.otf', weight: '800', style: 'normal' },
    { path: '../fonts/SohneMono-Extrafett.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-sohne-mono',
  display: 'swap',
});

// Loaded, not currently applied anywhere — available via var(--font-sohne-schmal).
export const sohneSchmal = localFont({
  src: [
    { path: '../fonts/SohneSchmal-Extraleicht.otf', weight: '200', style: 'normal' },
    { path: '../fonts/SohneSchmal-Leicht.otf', weight: '300', style: 'normal' },
    { path: '../fonts/SohneSchmal-Buch.otf', weight: '400', style: 'normal' },
    { path: '../fonts/SohneSchmal-Kraftig.otf', weight: '500', style: 'normal' },
    { path: '../fonts/SohneSchmal-Halbfett.otf', weight: '600', style: 'normal' },
    { path: '../fonts/SohneSchmal-Dreiviertelfett.otf', weight: '700', style: 'normal' },
    { path: '../fonts/SohneSchmal-Fett.otf', weight: '800', style: 'normal' },
    { path: '../fonts/SohneSchmal-Extrafett.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-sohne-schmal',
  display: 'swap',
});
