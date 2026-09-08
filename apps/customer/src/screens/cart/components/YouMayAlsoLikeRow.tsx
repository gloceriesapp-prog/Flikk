// "Popular Picks Nearby" — CartScreen's own upsell card, right above
// BillDetailsCard. Horizontal scroll of the exact same
// ProductCard used everywhere else in the app (home grids, search, similar-
// products) instead of a bespoke dense-row layout — reusing it gets the
// real product photo, veg indicator, size chips, discount badge, and
// tap-to-open ProductDetailSheet for free, and means a product looks
// identical whether it's found here or on the home screen.
//
// The product list is picked ONCE per mount (lazy useState initializer, a
// random slice across everyday-essentials/bakery/farm/fish rather than just
// the first few of one list) and never recomputed from cart contents. An
// earlier version filtered out whatever was already in the cart on every
// render, which meant tapping ADD on a card here made that exact card
// vanish and the whole row reflow — jarring, and wrong: adding something to
// the cart doesn't mean it stops being a product worth suggesting again
// (ProductCard already turns its own ADD into a +/- stepper once it's in
// the cart, which is the correct "you've added this" signal, not the card
// vanishing).
//
// "See all" jumps into the real Search screen — every product in this
// row's own pool is real (home/*/data.ts), not a dead link to nowhere.

import { useState } from 'react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { ProductCard } from '../../home/products/ProductCard';
import { EVERYDAY_ESSENTIALS_PRODUCTS } from '../../home/everyday-essentials/data';
import { BAKERY_PRODUCTS } from '../../home/bakery/data';
import { FARM_PRODUCTS } from '../../home/groceries/data';
import { FISH_PRODUCTS } from '../../home/fish/data';
import type { Product } from '../../home/products/types';
import type { AppStackParamList } from '../../../navigation/types';

// 3x2 grid (6 cards, ProductCardView's own default 'w-[32%]' width — the
// same width ProductSection's home-screen grids already use, so a card
// looks identical here) — no horizontal ScrollView anymore, per an explicit
// ask to drop the scroll and show everything up front instead.
const MAX_PRODUCTS = 6;
const ACCENT = '#155DFC';
const PRODUCT_POOL: Product[] = [...EVERYDAY_ESSENTIALS_PRODUCTS, ...BAKERY_PRODUCTS, ...FARM_PRODUCTS, ...FISH_PRODUCTS];

function pickRandomProducts(pool: Product[], count: number): Product[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function YouMayAlsoLikeRow() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [products] = useState(() => pickRandomProducts(PRODUCT_POOL, MAX_PRODUCTS));

  if (products.length === 0) return null;

  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <Text className="text-[15px] font-semibold text-ink">You might also need these</Text>

      <View className="flex-row flex-wrap justify-between gap-y-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} showDiscountBadge />
        ))}
      </View>

      <Pressable
        onPress={() => navigation.navigate('Search')}
        className="flex-row items-center justify-center gap-1 rounded-xl border border-gray-200 py-2.5"
      >
        <Text className="text-[13px] font-semibold" style={{ color: ACCENT }}>
          View more
        </Text>
        <AppIcon icon={ArrowRight02Icon} size={13} color={ACCENT} />
      </Pressable>
    </View>
  );
}
