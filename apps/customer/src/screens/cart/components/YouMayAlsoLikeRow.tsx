// "Popular Picks Nearby" — CartScreen's own upsell card, between
// DeliveryTipCard and BillDetailsCard. Redesigned as a vertical list
// (thumbnail | name+weight | ADD pill/stepper | price) instead of the old
// horizontal ProductCard scroller — matches the dense "Most Bought Near
// You" pattern real grocery apps use in-cart, where a quick scan-and-tap
// matters more than a big product photo someone's about to buy anyway.
//
// The product list is picked ONCE per mount (lazy useState initializer, a
// random slice across everyday-essentials/bakery/farm/fish rather than just
// the first few of one list) and never recomputed from cart contents. An
// earlier version filtered out whatever was already in the cart on every
// render, which meant tapping ADD on a row here made that exact row vanish
// and the whole list reflow — jarring, and wrong: adding something to the
// cart doesn't mean it stops being a product worth suggesting again (this
// row already turns its own ADD into a +/- stepper once it's in the cart,
// which is the correct "you've added this" signal, not the row vanishing).
//
// "See all" jumps into the real Search screen — every product in this
// row's own pool is real (home/*/data.ts), not a dead link to nowhere.

import { useState } from 'react';
import { AddSquareIcon, ArrowRight02Icon, MinusSignIcon, ShoppingBasket03Icon } from '@hugeicons/core-free-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { useCartStore } from '../../../store/useCartStore';
import { addToCart } from '../../../store/addToCart';
import { EVERYDAY_ESSENTIALS_PRODUCTS } from '../../home/everyday-essentials/data';
import { BAKERY_PRODUCTS } from '../../home/bakery/data';
import { FARM_PRODUCTS } from '../../home/groceries/data';
import { FISH_PRODUCTS } from '../../home/fish/data';
import type { Product } from '../../home/products/types';
import type { AppStackParamList } from '../../../navigation/types';

const MAX_PRODUCTS = 4;
const ACCENT = '#155DFC';
const PRODUCT_POOL: Product[] = [...EVERYDAY_ESSENTIALS_PRODUCTS, ...BAKERY_PRODUCTS, ...FARM_PRODUCTS, ...FISH_PRODUCTS];

function pickRandomProducts(pool: Product[], count: number): Product[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function ProductRow({ product, isLast }: { product: Product; isLast: boolean }) {
  const { id, name, weight, price, originalPrice, imageUrl, storeId, storeName } = product;
  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  return (
    <View className={`flex-row items-center gap-3 py-3 ${isLast ? '' : 'border-b border-mist'}`}>
      <View className="h-12 w-12 overflow-hidden rounded-xl bg-mist">
        <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>

      <View className="flex-1 gap-0.5">
        <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[12px] text-ink/45">{weight}</Text>
      </View>

      {quantity === 0 ? (
        <Pressable
          onPress={() => addToCart({ id, name, weight, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })}
          className="rounded-full border-[1.5px] px-4 py-1.5"
          style={{ borderColor: ACCENT }}
        >
          <Text className="text-xs font-bold" style={{ color: ACCENT }}>
            ADD
          </Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-2.5 rounded-full border-[1.5px] px-2.5 py-1.5" style={{ borderColor: ACCENT }}>
          <Pressable onPress={() => decrementItem(id)} hitSlop={6}>
            <AppIcon icon={MinusSignIcon} size={13} color={ACCENT} />
          </Pressable>
          <Text className="min-w-[12px] text-center text-xs font-bold" style={{ color: ACCENT }}>
            {quantity}
          </Text>
          <Pressable onPress={() => incrementItem(id)} hitSlop={6}>
            <AppIcon icon={AddSquareIcon} size={13} color={ACCENT} />
          </Pressable>
        </View>
      )}

      <View className="items-end" style={{ minWidth: 44 }}>
        <Text className="text-[14px] font-bold text-ink">₹{price}</Text>
        {originalPrice ? <Text className="text-[11px] text-ink/35 line-through">₹{originalPrice}</Text> : null}
      </View>
    </View>
  );
}

export function YouMayAlsoLikeRow() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [products] = useState(() => pickRandomProducts(PRODUCT_POOL, MAX_PRODUCTS));

  if (products.length === 0) return null;

  return (
    <View className="gap-1 rounded-2xl bg-white px-4 py-4">
      <View className="mb-1 flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}14` }}>
          <AppIcon icon={ShoppingBasket03Icon} size={16} color={ACCENT} />
        </View>
        <Text className="text-[15px] font-bold text-ink">Popular Picks Nearby</Text>
      </View>

      {products.map((product, index) => (
        <ProductRow key={product.id} product={product} isLast={index === products.length - 1} />
      ))}

      <Pressable onPress={() => navigation.navigate('Search')} className="flex-row items-center justify-between pt-3">
        <Text className="text-sm font-bold text-ink">See all</Text>
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT }}>
          <AppIcon icon={ArrowRight02Icon} size={15} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}
