// Same Söhne setup as apps/admin/src/theme/fonts.ts — German weight names
// kept as-is: Extraleicht (200), Leicht (300), Buch ("book", 400 — the
// family's regular), Kraftig (500), Halbfett (600), Dreiviertelfett (700),
// Fett (800), Extrafett (900).

import localFont from 'next/font/local';

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
