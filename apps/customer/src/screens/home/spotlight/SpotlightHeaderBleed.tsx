// Wraps SpotlightCarousel with a background layer so the header's own
// background visually continues down through this whole section instead
// of handing off to an unrelated flat color, per an explicit ask/
// reference.
//
// Plain SOLID fill (headerGradient.bottomColor — the exact color
// HomeHeader.tsx itself ends on, so the two can never visibly mismatch),
// not a fade/gradient — per an explicit ask ("dont add css masking, just
// reduce the bottom space"): a hard cut at the card's own bottom edge.
//
// This is ONLY ever visible beside/around the cards (the gaps above,
// below, and between them) — the cards themselves are opaque and sit ON
// TOP of this layer, so it never touches their real content.
//
// PANEL_HEIGHT is computed from the same real per-row/header/footer
// arithmetic MostShoppedCard.tsx's own layout uses (HEADER_HEIGHT +
// minRows*ROW_HEIGHT + FOOTER_HEIGHT), not a separate guessed constant —
// this file calls useSpotlightCards() itself to get the exact same
// minRows the carousel's own cards are padded to. Left at 0 (no bleed)
// while cards.length === 0 — useEverydayEssentials' catalog loads async,
// so on first paint there's genuinely nothing to size a background bleed
// for yet; SpotlightCarousel itself renders null in that state too.
//   20 — SpotlightCarousel's own `pt-5` top padding, the same real gap
//        now added above the card to match the green breathing room
//        below it (keep in sync with that file's own pt- value)
// - 45 — real card content is sized by MostShoppedCard's own actual
//        layout now, not forced to this formula's own worst-case
//        estimate (that file's own minHeight note) — the formula still
//        overshoots the real rendered card height by more than the
//        earlier -20 trim accounted for, so this cuts further back
//        toward the card's real bottom edge instead of leaving a visible
//        band of solid green past it.
//
// marginTop: -2 closes a separate, well-known RN sticky-header seam:
// HomeHeader is stickyHeaderIndices={[0]} (HomeScreen.tsx), rendered as its
// own composited layer over the scrolling content — that boundary can show
// a 1-2px rounding hairline against whatever's directly beneath it, even
// when the colors are mathematically identical. Tucking this panel 2px up
// under the header's own bottom edge removes any gap for that to appear in.

import { View } from 'react-native';
import { useActiveHeaderGradient } from '../data/useActiveHeaderGradient';
import { FOOTER_HEIGHT, HEADER_HEIGHT, ROW_HEIGHT } from '../most-shopped/MostShoppedCard';
import { SpotlightCarousel } from './SpotlightCarousel';
import { useSpotlightCards } from './useSpotlightCards';

export function SpotlightHeaderBleed() {
  const { cards, minRows } = useSpotlightCards();
  const cardHeight = HEADER_HEIGHT + minRows * ROW_HEIGHT + FOOTER_HEIGHT;
  const panelHeight = cards.length > 0 ? 20 + cardHeight - 45 : 0;

  // useSpotlightAccent=false — matches HomeHeader.tsx's own call, so this
  // panel's color can't drift from the header's per-category color.
  const headerGradient = useActiveHeaderGradient('all', false);

  return (
    <View
      className="overflow-hidden"
      style={{ position: 'relative', height: panelHeight, marginTop: -2, backgroundColor: headerGradient.bottomColor }}
    >
      <SpotlightCarousel />
    </View>
  );
}
