// Cross-component signal: which SpotlightCarousel card (Home) is currently
// on screen, keyed the same as useSpotlightCards.ts's own SpotlightCard.key
// ('trending-store' | 'trending-area' | 'best-deals'). HomeHeader.tsx reads this to
// tint its own background gradient to match, so the header visually follows
// whatever card the carousel is actually showing — a zustand store because
// SpotlightCarousel (inside AllTabSections) and HomeHeader (HomeScreen's
// own direct child) are siblings, not parent/child; no prop path connects
// them directly. Ephemeral, not persisted — always null on cold start, and
// reset to null by SpotlightCarousel's own unmount cleanup the moment it's
// off screen (e.g. switching off the "All" tab), so HomeHeader falls back
// to its normal per-category gradient rather than getting stuck on
// whatever card was last showing.
import { create } from 'zustand';

interface SpotlightAccentState {
  activeCardKey: string | null;
  setActiveCardKey: (key: string | null) => void;
}

export const useSpotlightAccentStore = create<SpotlightAccentState>((set) => ({
  activeCardKey: null,
  setActiveCardKey: (key) => set({ activeCardKey: key }),
}));
