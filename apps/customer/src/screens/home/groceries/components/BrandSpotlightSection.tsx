// "Snack Stash" — a horizontal spotlight row on the Groceries tab, per an
// explicit reference image (a food-delivery app's brand-carousel: short
// catchy title, a horizontal row of product cards, a full-width "See All"
// pill closing it out below the row). Uses the exact same shared product
// card everywhere else in this app (ProductCard, home/products/) — not a
// bespoke card — so ADD/wishlist/quantity-stepper behavior stays identical
// to every other product grid.
//
// Backed by dummyBrandSpotlightProducts.ts for now (TEMPORARY, see that
// file's own note) — no real "featured brand" concept exists in the
// schema yet to read a real version of this section from.
//
// "See All" has no destination screen yet (no real "browse this
// spotlight's full list" feed exists behind it) — same "UI exists, flow
// not wired" convention already used elsewhere in this app (e.g.
// ProductCardView's own unwired bookmark heart) rather than either
// blocking this section on building that screen or faking a working link.
// The 3 overlapping avatar thumbnails are real photos from this same
// product list — a random 3 each time this mounts (useMemo, picked once
// per mount, not reshuffled on every re-render), not always the same
// first 3 — a real preview of what "See All" actually leads to, just not
// a static one.

import { useMemo } from 'react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { AppIcon } from '../../../../components/AppIcon';
import { ProductCard } from '../../products/ProductCard';
import { DUMMY_BRAND_SPOTLIGHT_PRODUCTS } from './dummyBrandSpotlightProducts';
import type { Product } from '../../products/types';

function pickRandomThree(products: Product[]): Product[] {
  return [...products].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function BrandSpotlightSection() {
  const avatarPreview = useMemo(() => pickRandomThree(DUMMY_BRAND_SPOTLIGHT_PRODUCTS), []);

  return (
    <View className="pt-6">
      <Text className="px-5 text-[19px] font-semibold text-ink">Build Your Perfect Snack Stash</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5 pt-4">
        {DUMMY_BRAND_SPOTLIGHT_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-28" showDiscountBadge />
        ))}
      </ScrollView>

      {/* Full-width "See All" pill — sits below the row, not inside the
          horizontal scroll, per an explicit reference image. */}
      <Pressable className="mx-5 mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-[#EEF2FF] py-4">
        <View className="flex-row">
          {avatarPreview.map((product, i) => (
            <View
              key={product.id}
              style={{ marginLeft: i === 0 ? 0 : -12, zIndex: avatarPreview.length - i }}
              className="h-9 w-9 overflow-hidden rounded-full border border-[#EEF2FF] bg-gray-200"
            >
              <Image source={{ uri: product.imageUrl }} className="h-full w-full" resizeMode="cover" />
            </View>
          ))}
        </View>
        <Text className="text-[15px] font-semibold text-[#2457F5]">See All</Text>
        <View className="flex-row items-center">
          <View style={{ marginLeft: -3 }}>
            <AppIcon icon={ArrowRight02Icon} size={16} color="#2457F5" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
