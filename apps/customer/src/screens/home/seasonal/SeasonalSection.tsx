// Seasonal home-tile grid — Home's "All" tab, first section (above
// MostBoughtSection). Renamed from GaneshChaturthiSection.tsx/
// ganesh-chaturthi/ per an explicit ask: this section gets reskinned per
// festival, so neither the folder, the file, nor the component name
// should be tied to whichever festival happens to be live right now — see
// data.ts's own note on what actually changes when the festival does
// (just SEASONAL_TILES + FESTIVAL_TITLE/SUBTITLE below, nothing
// structural).
//
// FINAL call, with an actual reason this time: a plain free-scrolling
// row, not the paged/snap-to-full-page version tried in between — the
// last tile in view is deliberately cut at the edge so it visibly signals
// "there's more, keep scrolling" (an explicit ask, same peek-carousel
// pattern StoreCard.tsx's own photo strip already uses on the Store
// screen).
//
// Square tiles (equal width/height — "4x4" per an earlier ask), sized so
// exactly 3 fit fully plus half of a 4th (VISIBLE_TILES), per an explicit
// reference — tileSize is derived from a MEASURED width (rowWidth state,
// onLayout below), not a hardcoded pixel guess, so the 3-full-plus-half
// ratio actually holds on any screen size rather than only the one it
// was eyeballed against.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { SEASONAL_TILES } from './data';

const PANEL_BG = '#F2ECF8';
const TILE_GAP = 12; // matches contentContainerClassName's own gap-3
const VISIBLE_TILES = 3.5; // 3 full tiles + half of the 4th, in view at once

// Placeholder — real seasonal banner art (swapped per festival, same as
// SEASONAL_TILES below) once that exists; this is just a real asset to
// look at for now, not tied to any specific festival's own branding.
const SEASONAL_BANNER_URI = 'https://i.pinimg.com/736x/0c/69/84/0c6984c0bbf9097af96e3a64ba140b9c.jpg';

export function SeasonalSection() {
  const [rowWidth, setRowWidth] = useState(0);

  if (SEASONAL_TILES.length === 0) return null;

  const tileSize = rowWidth > 0 ? (rowWidth - TILE_GAP * Math.floor(VISIBLE_TILES)) / VISIBLE_TILES : 0;

  function handleRowLayout(event: LayoutChangeEvent) {
    setRowWidth(event.nativeEvent.layout.width);
  }

  return (
    // w-full is explicit, not decorative — this panel was relying on
    // implicit flex-stretch (a column's default cross-axis behavior) to
    // reach full screen width, but HomeScreen.tsx's own Animated.ScrollView
    // uses stickyHeaderIndices={[0]} (for HomeHeader), and RN's sticky-
    // header implementation re-wraps the flagged child in a way that can
    // leave LATER siblings' implicit stretch unreliable on some platform/
    // RN-version combinations — this section sits right after that sticky
    // header in the same content list. Declaring the width explicitly
    // instead of depending on inherited stretch is what actually
    // guarantees this panel's own background reaches the real screen
    // edge regardless of that ancestor's own stickyHeaderIndices setup.
    <View className="w-full gap-4 rounded-b-[32px] px-5 pb-6 pt-6" style={{ backgroundColor: PANEL_BG }}>
      {/* Replaces the old "Ganesh Chaturthi Specials" text heading, per an
          explicit ask — short (h-20), and no side inset now (mx-0, not the
          first pass's mx-10): the grid row below has no horizontal margin
          of its own beyond this panel's own px-5, so this banner needs
          none either to actually match the 3-card row's own width, per a
          later ask ("increase the image width... 3 card max width"). */}
      <Image
        source={{ uri: SEASONAL_BANNER_URI }}
        contentFit="cover"
        className="h-20 rounded-2xl"
      />

      {/* Asymmetric on purpose: the LEFT edge stays governed by this
          panel's own px-5 (same as the banner image above it, per an
          explicit ask), but -mr-5 cancels the panel's right padding for
          this row only, so the scrollable area bleeds to the true screen
          edge instead of matching the left's inset — that's what lets
          the trailing tile actually get cut off right at the edge
          (rather than the panel's own padding creating a blank gap
          before the cut ever shows). onLayout measures that real
          (left-inset, right-bled) width once, which tileSize above is
          derived from. Renders nothing on the very first frame (rowWidth
          still 0) rather than flashing wrongly-sized tiles before that
          measurement lands. */}
      <View className="-mr-5" onLayout={handleRowLayout}>
        {rowWidth > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
            {SEASONAL_TILES.map((tile) => (
              <Pressable
                key={tile.id}
                className="justify-between rounded-2xl bg-white p-3"
                style={{ width: tileSize, height: tileSize }}
              >
                <Text className="text-[12px] font-medium text-center item-center leading-4 text-ink" numberOfLines={2}>
                  {tile.title}
                </Text>

                <Image source={{ uri: tile.imageUrl }} className="h-16 w-16 self-end" resizeMode="contain" />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
