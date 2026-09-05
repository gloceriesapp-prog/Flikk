// Seasonal home-tile grid — Home's "All" tab, first section (above
// MostBoughtSection). Renamed from GaneshChaturthiSection.tsx/
// ganesh-chaturthi/ per an explicit ask: this section gets reskinned per
// festival, so neither the folder, the file, nor the component name
// should be tied to whichever festival happens to be live right now — see
// data.ts's own note on what actually changes when the festival does
// (just SEASONAL_TILES + FESTIVAL_TITLE/SUBTITLE below, nothing
// structural).
//
// Real 3-column x 2-row grid (6 equal white cards), not the earlier
// "1 large + 4 thin pills" layout — that broke because flex-1 on a
// flex-wrap row fights the w-[47%] basis and forces every item onto one
// line instead of wrapping. Fixed by giving every tile the same
// %-based width with no flex-1, so wrapping is driven purely by width,
// same recipe ProductSection.tsx's own grid already uses successfully.
// White cards (not a solid tint) — reads cleaner against this section's
// own lavender panel than 6 solid color blocks would. Real image per tile
// (tile.imageUrl, data.ts), not an emoji or a discount-percent line —
// per an explicit ask to drop both; every tile currently points at the
// same placeholder photo until real per-tile photography exists.
//
// These are category shortcuts a customer taps into, not individual
// add-to-cart products, so ProductCard's own image/ADD/stepper UI was the
// wrong component for this content. No onPress wired yet — there's no
// per-tile category browse screen built, same "UI exists, flow not
// wired" convention as ProductCardView's own bookmark heart.
//
// Renders nothing when SEASONAL_TILES is empty — same convention as every
// other Home section (StoreTypesSection.tsx's own note).
//
// Pale lavender panel (not mint) — synced to HomeHeader's own All-tab
// gradient (categoryHeaderGradients.ts, deep charcoal-to-aubergine),
// scoped to THIS section only (not AllTabSections' own page bg, which
// stays plain white for every other section) — a rounded-bottom block
// that reads as one deliberate seasonal module dropped into the page,
// carrying the same premium purple identity the header just switched to
// instead of clashing with it in leftover green.

import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { SEASONAL_TILES } from './data';

const PANEL_BG = '#F2ECF8';

const FESTIVAL_TITLE = 'Ganesh Chaturthi Specials';
const FESTIVAL_SUBTITLE = "Everything for this year's pooja, from your local store";

export function SeasonalSection() {
  if (SEASONAL_TILES.length === 0) return null;

  return (
    <View className="gap-4 rounded-b-[32px] px-5 pb-6 pt-6" style={{ backgroundColor: PANEL_BG }}>
      <View className="flex-row items-center gap-3">
        {/* <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: '#D9822B26' }}>
          <GaneshaIcon size={24} color="#B33A1E" />
        </View> */}
        <View className="flex-1">
          <Text className="text-[20px] font-extrabold text-center text-ink">{FESTIVAL_TITLE}</Text>
          {/* <Text className="text-[12.5px] text-ink/60">{FESTIVAL_SUBTITLE}</Text> */}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {SEASONAL_TILES.map((tile) => (
          <Pressable key={tile.id} className="h-[128px] w-[31%] justify-between rounded-2xl bg-white p-3">
            <Text className="text-[14px] font-medium leading-4 text-ink" numberOfLines={2}>
              {tile.title}
            </Text>

            <Image source={{ uri: tile.imageUrl }} className="h-16 w-16 self-end" resizeMode="contain" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
