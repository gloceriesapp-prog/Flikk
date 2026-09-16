// Single source of truth for "which gradient is the header showing right
// now" — HomeHeader.tsx and SpotlightHeaderBleed.tsx (the colored wash
// that extends the header's background down behind SpotlightCarousel,
// fading to white) both need the EXACT same answer, or the bleed panel
// visibly mismatches whatever color the header itself actually is.
//
// No more closed-hours red override — per an explicit ask ("remove that
// red and keep it as how it is only bg"), the header keeps its normal
// per-category/spotlight color around the clock now. The 10:30 PM-6 AM
// IST closed window is still communicated (LocationSelector's "Closed for
// now"/"Opens 6:00 AM tomorrow" text, CollapsibleHeaderTop's own isClosed
// prop) — just not as a background-color swap anymore.
//
// useSpotlightAccent defaults to true for SpotlightHeaderBleed's own use,
// but HomeHeader.tsx now passes false — per an explicit ask to hide "the
// spotlight effect for header" specifically (the header no longer follows
// whichever spotlight card is on screen) while leaving everything else
// (the card section itself, its own auto-advance/drag) untouched.
import { useSpotlightAccentStore } from '../../../store/useSpotlightAccentStore';
import { gradientForTabName, type CategoryHeaderGradient } from './categoryHeaderGradients';
import { gradientForSpotlightKey } from './spotlightGradients';

export function useActiveHeaderGradient(categoryName: string, useSpotlightAccent = true): CategoryHeaderGradient {
  const spotlightCardKey = useSpotlightAccentStore((state) => state.activeCardKey);
  return useSpotlightAccent && spotlightCardKey ? gradientForSpotlightKey(spotlightCardKey) : gradientForTabName(categoryName);
}
