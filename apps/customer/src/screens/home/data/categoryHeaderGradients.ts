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
  all: gradient([
 '#8EB2FC',
  '#A5C4FD',
  '#BDD4FF',
  '#D5E4FF',
  ]),
  groceries: gradient([
    '#D2BA98', '#E2CDAF', '#F1E2CC', '#FCF7EF',
  ]),
  fresh: gradient([
    '#A1C48C', '#BED7A7', '#DFECCB', '#F8FCF2',
  ]),
  'meat & fish': gradient([
    '#8DB9C6', '#AED0D9', '#D8E9ED', '#F7FBFC',
  ]),
  regional: gradient([
    '#D7926E', '#E6AF8F', '#F3D2BB', '#FFF7F0',
  ]),
  bakery: gradient([
    '#D5A96F', '#E9C594', '#F5E0BD', '#FFFAF1',
  ]),
};

export function gradientForTabName(name: string): CategoryHeaderGradient {
  return GRADIENT_BY_TAB_NAME[name.trim().toLowerCase()] ?? GRADIENT_BY_TAB_NAME.all;
}

