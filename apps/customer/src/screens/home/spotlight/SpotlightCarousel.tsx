// Manual-only, draggable carousel of MostShoppedCard.tsx's own shell — 4
// real cards (useSpotlightCards.ts), same reused UI rather than a new one,
// per an explicit ask. Sits directly below the header (AllTabSections.tsx).
//
// Auto-advance removed per an explicit ask ("remove the automatic sliding
// and only keep manual") — this now just tracks whichever card the user
// has scrolled to (handleScrollSettled, on both onScrollEndDrag and
// onMomentumScrollEnd for the reasons in that callback's own note) and
// publishes it to useSpotlightAccentStore for the header's own bleed tint
// to follow. No timer, so there's nothing for a manual drag to fight or
// interrupt.

import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { MostShoppedCard } from '../most-shopped/MostShoppedCard';
import { useSpotlightAccentStore } from '../../../store/useSpotlightAccentStore';
import { useSpotlightCards } from './useSpotlightCards';

const SIDE_INSET = 20; // matches every other Home section's own px-5
// 16, was 12 — per an explicit ask for more breathing room between cards.
const CARD_GAP = 16;
const CARD_STEP = 300 + CARD_GAP; // MostShoppedCard's own fixed PANEL_WIDTH + gap

export function SpotlightCarousel() {
  const { cards, minRows } = useSpotlightCards();
  const indexRef = useRef(0);
  const setActiveCardKey = useSpotlightAccentStore((state) => state.setActiveCardKey);

  const publishActiveCard = useCallback(
    (index: number) => {
      setActiveCardKey(cards[index]?.key ?? null);
    },
    [cards, setActiveCardKey],
  );

  useEffect(() => {
    // Index may now point past the end if `cards` shrank (a filter's real
    // data changed) — clamp before republishing off it.
    indexRef.current = cards.length > 0 ? indexRef.current % cards.length : 0;
    publishActiveCard(indexRef.current);
  }, [cards, publishActiveCard]);

  useEffect(() => () => setActiveCardKey(null), [setActiveCardKey]);

  const handleScrollSettled = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      indexRef.current = Math.round(e.nativeEvent.contentOffset.x / CARD_STEP);
      publishActiveCard(indexRef.current);
    },
    [publishActiveCard],
  );

  if (cards.length === 0) return null;

  return (
    // pt-5 — a real gap above the card now, matching the same green
    // breathing room SpotlightHeaderBleed.tsx's own trimmed panel leaves
    // below it, per an explicit ask to add the same treatment on top.
    // SpotlightHeaderBleed.tsx's own panelHeight formula hardcodes this
    // same 20px — keep the two in sync if this changes.
    <View className="pt-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SIDE_INSET, gap: CARD_GAP }}
        snapToInterval={CARD_STEP}
        snapToAlignment="start"
        decelerationRate="fast"
        onScrollEndDrag={handleScrollSettled}
        onMomentumScrollEnd={handleScrollSettled}
      >
        {cards.map((card) => (
          <MostShoppedCard key={card.key} title={card.title} products={card.products} ctaLabel={card.ctaLabel} minRows={minRows} />
        ))}
      </ScrollView>
    </View>
  );
}
