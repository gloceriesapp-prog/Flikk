// Seasonal home-tile grid — Home's "All" tab, first section (above
// MostBoughtSection). Renamed from GaneshChaturthiSection.tsx/
// ganesh-chaturthi/ per an explicit ask: this section gets reskinned per
// festival, so neither the folder, the file, nor the component name
// should be tied to whichever festival happens to be live right now — see
// data.ts's own note on what actually changes when the festival does
// (just SEASONAL_TILES + FESTIVAL_TITLE/SUBTITLE below, nothing
// structural).
//
// Fixed 2x2 grid now, no scrolling — per an explicit ask, replacing the
// earlier free-scrolling "3 full + a peek of the 4th" row. SEASONAL_TILES
// is capped at exactly 4 for this reason (data.ts's own note); a 2-column
// wrap is what actually shows all of them at once with nothing cut off or
// hidden behind a scroll a customer might not notice.
//
// Panel background is plain white now (PANEL_BG), not the earlier tinted
// peach — per an explicit ask to move the color onto the cards
// themselves instead (data.ts's own per-tile bgColor) so each tile reads
// as its own small colored object sitting on a clean white shelf, rather
// than white cards on one flat tinted background.
//
// Tiles fill their full half-row width (2 per row, edge to edge via
// justify-between), sized from a MEASURED row width (rowWidth state,
// onLayout below) rather than a hardcoded pixel guess — height is a
// fraction of that measured width (HEIGHT_RATIO), not equal to it, so the
// tile is a shorter rectangle rather than a full square.

import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { SEASONAL_TILES } from './data';

// Exported — AllTabSections.tsx wraps this section AND FestivalPicksSection
// in one shared panel using this same color, per an explicit ask to treat
// the seasonal banner/tiles and the festival product row as one continuous
// section rather than two separately-backed blocks. This file no longer
// owns the panel's background/rounding itself (see the root View below) —
// the wrapper in AllTabSections.tsx does.
export const PANEL_BG = '#FFFFFF';
const TILE_GAP = 12; // matches the grid's own gap-y-3
const COLUMNS = 2;
// Not square anymore — width takes the tile's full even half-row share
// (justify-between pins both columns flush to the panel's real edges),
// height is a fraction of that width. Per an explicit ask: shrink the
// tile's height, but widen it back out to fill the row properly rather
// than shrinking both dimensions together (which made a too-small square).
const HEIGHT_RATIO = 0.72;

// Placeholder — real seasonal banner art (swapped per festival, same as
// SEASONAL_TILES below) once that exists; this is just a real asset to
// look at for now, not tied to any specific festival's own branding.
const SEASONAL_BANNER_URI = 'https://i.pinimg.com/736x/0c/69/84/0c6984c0bbf9097af96e3a64ba140b9c.jpg';

export function SeasonalSection() {
  const [rowWidth, setRowWidth] = useState(0);

  if (SEASONAL_TILES.length === 0) return null;

  const tileWidth = rowWidth > 0 ? (rowWidth - TILE_GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const tileHeight = tileWidth * HEIGHT_RATIO;

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
    <View className="w-full gap-4 px-5 pb-6 pt-6">
      {/* Replaces the old "Ganesh Chaturthi Specials" text heading, per an
          explicit ask — short (h-20), and no side inset now (mx-0, not the
          first pass's mx-10): the grid row below has no horizontal margin
          of its own beyond this panel's own px-5, so this banner needs
          none either to actually match the row's own width. */}
      <Image
        source={{ uri: SEASONAL_BANNER_URI }}
        contentFit="cover"
        className="h-20 rounded-2xl"
      />

      <View className="flex-row flex-wrap justify-between gap-y-3" onLayout={handleRowLayout}>
        {rowWidth > 0 &&
          SEASONAL_TILES.map((tile) => (
            <Pressable
              key={tile.id}
              className="justify-between rounded-[20px] border border-black/[0.04] p-3 shadow-sm shadow-black/5 active:opacity-80"
              style={{ width: tileWidth, height: tileHeight, backgroundColor: tile.bgColor }}
            >
              <Text className="text-[12px] font-semibold text-center item-center leading-4 text-ink" numberOfLines={2}>
                {tile.title}
              </Text>

              <Image source={{ uri: tile.imageUrl }} className="h-14 w-14 self-end" resizeMode="contain" />
            </Pressable>
          ))}
      </View>
    </View>
  );
}
