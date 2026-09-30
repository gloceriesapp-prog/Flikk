// ponytail: one runnable check for the price-font wiring. The real failure is
// silent — a family name PriceText asks for that has no matching font file
// renders as a fallback face, not an error. Node can't require() a .ttf (only
// Metro's asset transform can), so this checks the invariant at the filesystem
// level instead of importing theme/fonts.ts: the Gilroy weight PriceText uses
// for price numerals must have its file present, named exactly after the family.
//
// Run: npx tsx src/theme/fonts.selfcheck.ts

/// <reference types="node" />
import { existsSync } from 'fs';
import { join } from 'path';

// PriceText renders every price numeral in Gilroy-ExtraBold (components/
// PriceText.tsx) — the family name IS the filename (sans .ttf), which is what
// App.tsx's useFonts registers it under.
const PRICE_FONT_FAMILIES = ['Gilroy-ExtraBold'];
const fontsDir = join(__dirname, '../../assets/fonts');

for (const family of PRICE_FONT_FAMILIES) {
  if (!existsSync(join(fontsDir, `${family}.ttf`))) {
    throw new Error(`${family}.ttf missing from assets/fonts — PriceText would fall back to system font`);
  }
}

console.log('fonts.selfcheck OK:', PRICE_FONT_FAMILIES.join(', '));
