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
  all: gradient(['#051F17', '#0B3D2E', '#155E45', '#1F6B4F']),
  groceries: gradient(['#1F1409', '#4A2E12', '#7A4A1E', '#A8732F']),
  fresh: gradient(['#0C2410', '#194A1E', '#2E7A2E', '#4FA83B']),
  'meat & fish': gradient(['#04141F', '#0A2E42', '#134F63', '#1C7A8C']),
  regional: gradient(['#210808', '#4A1414', '#7A2620', '#A8432A']),
  bakery: gradient(['#1F0D16', '#421B2C', '#6B2E44', '#9C4A5C']),
};

export function gradientForTabName(name: string): CategoryHeaderGradient {
  return GRADIENT_BY_TAB_NAME[name.trim().toLowerCase()] ?? GRADIENT_BY_TAB_NAME.all;
}
