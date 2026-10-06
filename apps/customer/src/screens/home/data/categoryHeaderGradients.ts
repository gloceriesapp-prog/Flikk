// One premium 4-stop gradient per Home category tab — HomeHeader.tsx's own
// background swaps to match whichever tab is selected, same "each section
// gets its own jewel-tone identity" idea SeasonalSection.tsx already
// established for the Ganesh Chaturthi card. Keyed by tab name
// (lowercase), same matching convention as categoryTabs.ts's own
// iconForTabName — real admin tab names (GET /home-tabs) resolve here,
// anything unmatched falls back to 'all'.
//
// Each palette's last stop is also exported as its own value
// (gradientForTabName(...).bottomColor) — CategoryTabItem.tsx's selected-
// tab "scoop" cutout needs to match whatever color the header actually is
// at the point the tabs row sits, or the scoop shows a visible seam
// against the header behind it.

import { isFestivalTabName } from '../festival/data';

export interface CategoryHeaderGradient {
  colors: readonly [string, string, string, string];
  stops: readonly [number, number, number, number];
  bottomColor: string;
}

const STOPS = [0, 0.35, 0.65, 1] as const;

function gradient(colors: readonly [string, string, string, string]): CategoryHeaderGradient {
  return { colors, stops: STOPS, bottomColor: colors[3] };
}

const GRADIENT_BY_TAB_NAME: Record<string, CategoryHeaderGradient> = {
  // Deep emerald jewel-tone — per an explicit ask ("different colour...
  // more premium... attractive, clean"), replacing the earlier red-to-
  // orange sweep (which itself had overridden CLAUDE.md's own "not
  // orange" anti-clone rule). This brings 'all' back in line with the
  // app's own brand green family (ink/lime, CLAUDE.md design tokens) —
  // same near-black 'ink' starting point every palette here uses, ending
  // on a deep, saturated emerald rather than a hue outside the brand
  // palette entirely.
  //
  // Every palette below stays dark-to-deep across all 4 stops now, per a
  // later explicit ask ("dark bg colour effect... more premium") —
  // previously the last stop brightened into a fully saturated, fairly
  // light color; that read as cheerful/energetic rather than premium.
  // Same per-category hue identity, same dark-top starting point, just
  // the bottom stop lands on a deep, moody, still-saturated-but-dark
  // version of that hue instead of continuing to brighten toward it.
  // Light pastel wash for 'all' per an explicit ask — cream -> blush ->
  // lavender -> sky. Deliberately light (not the dark jewel-tones the other
  // tabs use), so the header text/icons flip to dark on this tab only
  // (HomeHeader threads an isLightHeader flag down for exactly this). Reads
  // airy/premium rather than moody.
all: gradient(['#58A754', '#2A8A41', '#237036', '#205E2F']),

groceries: gradient([
  '#D7BD9D',
  '#D7BD9D',
  '#D7BD9D',
  '#D7BD9D',
]),

fresh: gradient([
  '#B0CC9D',
  '#B0CC9D',
  '#B0CC9D',
  '#B0CC9D',
]),

'meat & fish': gradient([
  '#A5CBD5',
  '#A5CBD5',
  '#A5CBD5',
  '#A5CBD5',
]),

regional: gradient([
  '#E0B29C',
  '#E0B29C',
  '#E0B29C',
  '#E0B29C',
]),

bakery: gradient([
  '#D1AC77',
  '#DEBE91',
  '#ECD4B0',
  '#F8EBD5',
]),
};

export function gradientForTabName(name: string): CategoryHeaderGradient {
  if (isFestivalTabName(name)) {
    const color = '#F6C667';
    return gradient([color, color, color, color]);
  }
  return GRADIENT_BY_TAB_NAME[name.trim().toLowerCase()] ?? GRADIENT_BY_TAB_NAME.all;
}
