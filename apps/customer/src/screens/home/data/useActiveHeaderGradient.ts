// Single source of truth for "which gradient is the header showing right
// now" — HomeHeader.tsx and SpotlightHeaderBleed.tsx (the colored wash
// that extends the header's background down behind SpotlightCarousel,
// fading to white) both need the EXACT same answer, or the bleed panel
// visibly mismatches whatever color the header itself actually is.
//
// isClosed lives HERE, not applied separately by each caller — an earlier
// version of this hook deliberately left it out ("that's a real
// operating-hours override HomeHeader.tsx applies on top of this"), which
// was exactly the bug: HomeHeader passed its own isClosed through and
// showed CLOSED_HOURS_GRADIENT during the 9:30 PM-6 AM IST closed window,
// while SpotlightHeaderBleed never knew about that override and kept
// showing the plain category/spotlight gradient — the two visibly
// disagreed the moment the app was actually closed. Priority, highest
// first: isClosed > SpotlightCarousel's currently-on-screen card
// (useSpotlightAccentStore, when useSpotlightAccent is true) > the plain
// per-category gradient.
//
// useSpotlightAccent defaults to true for SpotlightHeaderBleed's own use,
// but HomeHeader.tsx now passes false — per an explicit ask to hide "the
// spotlight effect for header" specifically (the header no longer follows
// whichever spotlight card is on screen) while leaving everything else
// (the card section itself, its own auto-advance/drag) untouched.
import { useSpotlightAccentStore } from '../../../store/useSpotlightAccentStore';
import { CLOSED_HOURS_GRADIENT, gradientForTabName, type CategoryHeaderGradient } from './categoryHeaderGradients';
import { gradientForSpotlightKey } from './spotlightGradients';

export function useActiveHeaderGradient(categoryName: string, isClosed = false, useSpotlightAccent = true): CategoryHeaderGradient {
  const spotlightCardKey = useSpotlightAccentStore((state) => state.activeCardKey);
  if (isClosed) return CLOSED_HOURS_GRADIENT;
  return useSpotlightAccent && spotlightCardKey ? gradientForSpotlightKey(spotlightCardKey) : gradientForTabName(categoryName);
}
