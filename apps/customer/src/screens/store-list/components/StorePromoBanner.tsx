// Promo card — first thing in the scrollable body, directly under
// StoreFilterBar. Same visual family as StoreHeader.tsx (indigo/sapphire
// gradient + HeaderRays' sunburst overlay) rather than an unrelated color,
// so scrolling down from the header into this card reads as one
// continuous premium identity for the Store tab, not two unrelated
// blocks bolted together.
//
// Colors deliberately stay in Flikk's own brand family (coral CTA accent,
// gold for the cashback highlight, ink/white text) instead of the
// purple-gradient reference this was modeled on structurally — CLAUDE.md
// is explicit that lime/coral/gold exist specifically so this app doesn't
// read as a reskinned Zepto/Blinkit/Swiggy-style clone, and the reference
// composition (bold sticker-style % badges, sunburst rays, rounded CTA
// pill, real Google Pay branding) is recognizably that same competitor
// pattern. Kept the layout idea (badges + tagline + CTA over an ambient
// photo backdrop), not the specific brand/colors.

import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { HeaderRays } from '../../home/components/HeaderRays';
import { colors } from '../../../theme/tokens';

const BACKDROP_URI = 'https://i.pinimg.com/736x/96/6c/12/966c12a622e23772cd6252670df50a89.jpg';

// Same 4-stop family as StoreHeader.tsx's own gradient, just read
// top-to-bottom here instead of the header's own diagonal — what actually
// makes the two blocks feel like one continuous surface on scroll.
const PANEL_GRADIENT = {
  colors: ['#04050F', '#0A0E2E', '#141B52'] as const,
  stops: [0, 0.5, 1] as const,
};

export function StorePromoBanner() {
  return (
    // Full width now (was px-5 + rounded on all sides, leaving a visible
    // white margin on either side) — flush against the header above it,
    // per an explicit ask. Only the bottom corners stay rounded, same
    // rounded-b treatment StoreHeader.tsx uses, so it still reads as a
    // deliberate shape transitioning into the white filter row below it,
    // not a bug where the corners were forgotten.
    //
    // No outer shadow — a shadow here isn't clipped to this card's own
    // bounds (RN shadows render past the element, not inside it), so it
    // was bleeding a visible dark tint onto StoreFilterBar's white
    // background right below it, reading as an unwanted panel/bg there.
    <View className="w-full overflow-hidden rounded-b-[28px]">
      <LinearGradient
        colors={PANEL_GRADIENT.colors}
        locations={PANEL_GRADIENT.stops}
        style={{ height: 200 }}
      >
        <HeaderRays />

        {/* Backdrop photo — faded into the gradient via opacity rather
              than a hard edge, so whatever the photo depicts reads as
              ambient texture behind the badges/CTA, not competing with
              them for attention. */}
        <Image
          source={{ uri: BACKDROP_URI }}
          contentFit="cover"
          style={{ position: 'absolute', inset: 0, opacity: 0.32 }}
        />
        <LinearGradient
          colors={['rgba(4,5,15,0.15)', 'rgba(4,5,15,0.85)']}
          locations={[0, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />

        <View className="flex-1 items-center justify-center gap-3 px-6">
          <View className="flex-row items-center gap-2">
            <View
              className="rounded-2xl bg-white px-3.5 py-2 shadow-md shadow-black/30"
              style={{ transform: [{ rotate: '-4deg' }] }}
            >
              <Text className="text-[22px] font-extrabold leading-6 text-ink">
                Up to <Text style={{ color: colors.coral }}>50% OFF</Text>
              </Text>
            </View>
            <View
              className="rounded-2xl px-3.5 py-2 shadow-md shadow-black/30"
              style={{ backgroundColor: colors.gold, transform: [{ rotate: '3deg' }] }}
            >
              <Text className="text-[15px] font-extrabold leading-5 text-ink">
                + Extra{'\n'}10% back
              </Text>
            </View>
          </View>

          <Text className="text-[13px] font-semibold text-white/70">
            At your favourite stores nearby
          </Text>

          <Pressable className="mt-1 flex-row items-center gap-1 self-center rounded-full bg-white px-5 py-3">
            <Text className="text-[13.5px] font-bold text-ink">Explore all offers</Text>
            <AppIcon icon={ArrowRight01Icon} size={15} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
