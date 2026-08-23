// "You may also like" horizontal row on CartScreen, between DeliveryTipCard
// and BillDetailsCard — its own white card (matches the two cards it sits
// between) holding up to MAX_PRODUCTS ProductCard tiles in a horizontal
// scroll. Reuses ProductCard (not ProductCardView) since CartScreen isn't
// inside ProductDetailSheet's own component tree, so there's no require-
// cycle risk here the way there is in SimilarProductsRow.tsx — tapping a
// card here gets the full quick-view sheet for free.
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
// disappearing).

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { EVERYDAY_ESSENTIALS_PRODUCTS } from '../../home/everyday-essentials/data';
import { BAKERY_PRODUCTS } from '../../home/bakery/data';
import { FARM_PRODUCTS } from '../../home/groceries/data';
import { FISH_PRODUCTS } from '../../home/fish/data';
import type { Product } from '../../home/products/types';

const MAX_PRODUCTS = 6;
const PRODUCT_POOL: Product[] = [...EVERYDAY_ESSENTIALS_PRODUCTS, ...BAKERY_PRODUCTS, ...FARM_PRODUCTS, ...FISH_PRODUCTS];

function pickRandomProducts(pool: Product[], count: number): Product[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function YouMayAlsoLikeRow() {
  const [products] = useState(() => pickRandomProducts(PRODUCT_POOL, MAX_PRODUCTS));

  if (products.length === 0) return null;

  return (
    <View className="gap-3 rounded-2xl bg-white px-4 py-4">
      <Text className="text-xs font-bold uppercase tracking-wide text-ink/50">You may also like</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-32" />
        ))}
      </ScrollView>
    </View>
  );
}
