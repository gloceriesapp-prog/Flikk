// "Ganesh Chaturthi Special" — a suggestion row on Home's "All" tab, sitting
// above NearbyStoresSection ("Shops Near You"), per an explicit ask: the
// promo banner + category grid further up already point at this festival
// (Modak & Prasad / Pooja Essentials / Banana Leaves / Sweets & Jaggery),
// this section is the actual product suggestions that follow through on
// that, not just decoration. Uses the exact same shared product card
// everywhere else in this app (ProductCard, home/products/) — not a
// bespoke card — so ADD/wishlist/quantity-stepper behavior stays identical
// to every other product grid.
//
// Backed by dummyFestivalProducts.ts for now (TEMPORARY, see that file's
// own note) — no real per-store "festival items" tag exists in the schema
// yet to read a real version of this section from.
//
// No background/rounding of its own, no top padding — this section is
// meant to sit directly on the same panel SeasonalSection's own banner/
// tiles already painted (AllTabSections.tsx wraps both together, per an
// explicit "treat this as one section" ask), not float on its own
// separately-backed block below it.
//
// Capped at 6 real cards + a trailing "See All" card (same width as the
// product cards beside it, so it reads as the row's own closing card) —
// per an explicit ask. "See All" has no destination screen yet (no real
// "browse every festival item" feed exists behind it) — same "UI exists,
// flow not wired" convention already used elsewhere in this app (e.g.
// ProductCardView's own unwired bookmark heart) rather than either
// blocking this section on building that screen or faking a working link.

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { ProductCard } from '../products/ProductCard';
import { DUMMY_FESTIVAL_PRODUCTS } from './dummyFestivalProducts';

const VISIBLE_PRODUCTS = DUMMY_FESTIVAL_PRODUCTS.slice(0, 6);

export function FestivalPicksSection() {
  return (
    <View className="pb-6">
      <View className="gap-1 px-5 pb-4">
        <Text className="text-[19px] font-semibold text-ink">Ganesh Chaturthi Special</Text>
      </View>

      {/* items-start — a horizontal ScrollView's content container
          defaults to stretch on the cross axis, which is exactly what
          blew the "See All" card up to the full screen height (h-full
          resolved against that stretched, effectively-unbounded
          container, not the product cards beside it). Sizing every child
          to its own content, then giving "See All" the same fixed height
          as a product card's own square image (h-36) instead of h-full,
          is what actually keeps it card-sized. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-4 px-5">
        {VISIBLE_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-28" showDiscountBadge />
        ))}

        <Pressable className="h-28 w-28 items-center justify-center gap-1.5 rounded-2xl bg-[#EEF2FF]">
          <Text className="text-[13px] font-bold text-[#2457F5]">See All</Text>
          <AppIcon icon={ArrowRight02Icon} size={16} color="#2457F5" />
        </Pressable>
      </ScrollView>
    </View>
  );
}
