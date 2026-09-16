// Header gradient per SpotlightCarousel card (useSpotlightCards.ts's own
// key) — HomeHeader.tsx swaps to whichever of these matches the card
// currently on screen (useSpotlightAccentStore). Reuses categoryHeaderGradients.ts's
// existing palettes where the theme genuinely matches instead of inventing
// near-duplicate hues:
//  - 'trending-store' -> the real 'all' gradient (neutral default — a
//    single store's own mixed inventory doesn't map to any one category)
//  - 'trending-area'  -> same, zone-wide catalog, same neutral default
//  - 'best-deals'     -> a deep amber/gold palette (a "deal" hue no
//    existing category tab already owns), same dark-to-deep 4-stop shape
//    every other gradient in categoryHeaderGradients.ts uses.
//  - 'most-bought'    -> same neutral 'all' default as the other two
//    catalog-wide cards (it's the same catalog, just reversed — no distinct
//    theme to give it).

import { gradientForTabName, type CategoryHeaderGradient } from './categoryHeaderGradients';

const BEST_DEALS_GRADIENT: CategoryHeaderGradient = {
  colors: ['#1A1204', '#332309', '#4D3510', '#664717'],
  stops: [0, 0.35, 0.65, 1],
  bottomColor: '#664717',
};

const GRADIENT_BY_SPOTLIGHT_KEY: Record<string, CategoryHeaderGradient> = {
  'trending-store': gradientForTabName('all'),
  'trending-area': gradientForTabName('all'),
  'best-deals': BEST_DEALS_GRADIENT,
  'most-bought': gradientForTabName('all'),
};

export function gradientForSpotlightKey(key: string): CategoryHeaderGradient {
  return GRADIENT_BY_SPOTLIGHT_KEY[key] ?? gradientForTabName('all');
}

// MostShoppedCard's own light card bg per key — the same hue family as
// GRADIENT_BY_SPOTLIGHT_KEY above (a light TINT of it, never the literal
// dark header color: the card's title/row text is dark 'ink', so the card
// itself has to stay light for that text to stay readable) — kept in this
// same file, next to the dark gradient it's tinted from, so the two can
// never drift apart the way two separate color tables eventually would.
const CARD_TINT_BY_SPOTLIGHT_KEY: Record<string, string> = {
  'trending-store': '#F7E9DE', // light tint of the 'all' rust/orange family
  'trending-area': '#F7E9DE', // same family — same neutral gradient above
  'best-deals': '#F5EBD8', // light tint of BEST_DEALS_GRADIENT's amber
  'most-bought': '#F7E9DE', // same neutral family
};

export function cardTintForSpotlightKey(key: string): string {
  return CARD_TINT_BY_SPOTLIGHT_KEY[key] ?? CARD_TINT_BY_SPOTLIGHT_KEY['trending-store'];
}
