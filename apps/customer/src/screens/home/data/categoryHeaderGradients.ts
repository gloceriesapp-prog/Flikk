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
  all: gradient(['#050F06', '#0F2915', '#1A4527', '#256B3D']),
  groceries: gradient(['#150D05', '#2C1B0A', '#432A10', '#5A3916']),
  fresh: gradient(['#07150A', '#102910', '#1B3F1A', '#265424']),
  'meat & fish': gradient(['#020E15', '#062028', '#0B333F', '#114756']),
  regional: gradient(['#160505', '#2C0D0D', '#441515', '#5C1F16']),
  bakery: gradient(['#140811', '#2A121C', '#411D2A', '#582838']),
};

export function gradientForTabName(name: string): CategoryHeaderGradient {
  return GRADIENT_BY_TAB_NAME[name.trim().toLowerCase()] ?? GRADIENT_BY_TAB_NAME.all;
}

// Header background during the 10:30 PM–6:00 AM IST closed window
// (utils/operatingHours.ts) — light red, replacing whichever category
// gradient would otherwise show, so this state reads as "paused for now,"
// not as just another category's own brand color. Keeps the same dark-top
// -> deep-bottom shape every other gradient here now uses (not a
// literally pale-at-the-top gradient) — CollapsibleHeaderTop/search bar
// text and icons are white, and a truly pale top would make them
// unreadable; "light red" is expressed as noticeably lighter/softer than
// 'regional' above at every stop, not as low-contrast — darkened by the
// same "stay deep, never brighten to a fully saturated color" rule as
// every other palette here, just started from a lighter base so that
// relative signal still holds. Reverts to the normal per-tab gradient the
// instant isOutsideOperatingHours() flips back at 6 AM (HomeHeader.tsx
// picks between the two, nothing here needs to know about time itself).
export const CLOSED_HOURS_GRADIENT: CategoryHeaderGradient = gradient(['#241010', '#3E1917', '#5C231F', '#7A2E24']);
