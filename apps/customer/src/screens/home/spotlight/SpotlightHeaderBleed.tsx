// Wraps SpotlightCarousel with a background layer so the header's own
// background visually continues down through this whole section instead
// of handing off to an unrelated flat color, per an explicit ask/
// reference.
//
// Plain SOLID fill (headerGradient.bottomColor — the exact color
// HomeHeader.tsx itself ends on, so the two can never visibly mismatch),
// not a fade/gradient — per an explicit ask ("dont add css marking for
// now, just below the 3 card till there add the bg"): a hard cut at the
// card's own bottom edge, not a soft blend into white below it.
//
// This is ONLY ever visible beside/around the cards (the gaps above,
// below, and between them) — the cards themselves are opaque and sit ON
// TOP of this layer, so it never touches their real content.
//
// PANEL_HEIGHT is an EXPLICIT, fixed height on the outer container — not
// left to size itself from SpotlightCarousel's own (async) content, which
// is what an earlier version of this file did (useEverydayEssentials'
// catalog loads async, so on first paint SpotlightCarousel briefly renders
// null — sizing off that would flash a compressed/wrong-height band before
// real cards mount). PANEL_HEIGHT (below, after the imports):
//   12 — SpotlightCarousel's own `pt-3` top padding (keep in sync with
//        that file's own pt- value if it changes)
// + CARD_HEIGHT — MostShoppedCard's own real, FIXED height (that file's own
//        CARD_HEIGHT export — the card stopped being content-driven once
//        its bottom CTA bar had to land at a fixed y position regardless of
//        row count, so this can size off the card's real number instead of
//        a rough estimate).
// +  8 — small breathing room past the card's own bottom edge, per an
//        explicit ask ("extend the bg green... proper space in bottom") —
//        trimmed way down from an earlier 28px overshoot ("its too much")
//        to a modest gap, not a second empty band.
//
// marginTop: -2 closes a separate, well-known RN sticky-header seam:
// HomeHeader is stickyHeaderIndices={[0]} (HomeScreen.tsx), rendered as its
// own composited layer over the scrolling content — that boundary can show
// a 1-2px rounding hairline against whatever's directly beneath it, even
// when the colors are mathematically identical. Tucking this panel 2px up
// under the header's own bottom edge removes any gap for that to appear in.

import { View } from 'react-native';
import { useIsOutsideOperatingHours } from '../../../utils/useOperatingHours';
import { useActiveHeaderGradient } from '../data/useActiveHeaderGradient';
import { CARD_HEIGHT } from '../most-shopped/MostShoppedCard';
import { SpotlightCarousel } from './SpotlightCarousel';

const PANEL_HEIGHT = 12 + CARD_HEIGHT + 8;

export function SpotlightHeaderBleed() {
  // Same real-time check HomeScreen.tsx feeds into HomeHeader's own
  // isClosed — computed independently here (a pure function of the clock,
  // not view state) rather than threaded down as a prop, so this panel
  // can't get a stale/mismatched answer just because nobody happened to
  // pass it through.
  const isClosed = useIsOutsideOperatingHours();
  // useSpotlightAccent=false — matches HomeHeader.tsx's own call, so this
  // panel's color can't drift from the header's per-category color.
  const headerGradient = useActiveHeaderGradient('all', isClosed, false);

  return (
    <View
      className="overflow-hidden"
      style={{ position: 'relative', height: PANEL_HEIGHT, marginTop: -2, backgroundColor: headerGradient.bottomColor }}
    >
      <SpotlightCarousel />
    </View>
  );
}
