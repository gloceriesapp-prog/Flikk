// Floating footer island — now lives OUTSIDE the white card, in the blurred
// bottom gap (ProductDetailSheet.tsx), so it reads as a premium detached CTA
// (per an explicit ask, refs #108/#109). Two states:
//
// - Not in cart: price (+ struck original) on the LEFT, a content-width
//   "Add to Cart" button on the RIGHT — the price now DOES show here (it
//   floats outside the card, so it's the primary price the eye lands on;
//   the in-card ProductDetailInfo row is the secondary one). Blue (#1447e6).
// - In cart: the stepper (-/count/+) sits inside the SAME bar on the left,
//   an "Added" label stays on the right (not "Add to Cart" again — the tap
//   already happened) — matches the reference's "stepper left, label
//   right, one bar" layout, instead of the stepper being its own centered
//   pill with a basket-count button pulled out to the side. Same py-3.5
//   bar height in both states, not a smaller pill for the in-cart one.
//
// No background/border of its own beyond the bar itself — ProductDetailSheet.tsx
// wraps this in a BlurView glass overlay; only the bar (not the row padding
// around it) needs to be opaque blue.

import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../RupeePrice';
import { AppIcon } from '../AppIcon';
import { useCartStore } from '../../store/useCartStore';
import { addToCart } from '../../store/addToCart';
import type { Product } from '../../screens/home/products/types';

const BAR_BLUE = '#1447e6';

interface Props {
  product: Product;
  // ProductDetailSheet.tsx's own selected ProductVariantOptions pick —
  // undefined for a product with 0-1 real variants (the "no options" case),
  // in which case this falls back to the base product's own id/weight/
  // price exactly as before this prop existed.
  selectedVariant?: { id: string; label: string; price: number; originalPrice?: number };
}

export function ProductDetailFooter({ product, selectedVariant }: Props) {
  const { name, storeId, storeName, imageUrl } = product;
  // A different real variant genuinely has its own price (backend's
  // product_variants — see that table's own note: not a scaled base
  // price), so it needs its own cart line, not to overwrite/merge into
  // whichever variant of this product was added first. Suffixing the
  // product id with the variant id is what keeps "250 g" and "1 kg" of the
  // same product as two independent, correctly-priced CartItems.
  const id = selectedVariant ? `${product.id}::${selectedVariant.id}` : product.id;
  const weight = selectedVariant?.label ?? product.weight;
  const price = selectedVariant?.price ?? product.price;
  const originalPrice = selectedVariant?.originalPrice ?? product.originalPrice;

  const quantity = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  if (quantity === 0) {
    return (
      <View className="flex-row items-center justify-between px-5 py-4">
        <View>
          <View className="flex-row items-end gap-2">
            <RupeePrice amount={price} size={22} />
            {originalPrice != null && originalPrice > price && (
              <RupeePrice amount={originalPrice} size={14} strike color="#101C1066" style={{ paddingBottom: 2 }} />
            )}
          </View>
          <Text className="text-[11px] font-medium text-ink/50">{weight}</Text>
        </View>

        <Pressable
          onPress={() => addToCart({ id, name, weight, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl })}
          className="flex-row items-center justify-center rounded-2xl px-9 py-3.5"
          style={{ backgroundColor: BAR_BLUE }}
        >
          <Text className="text-base font-semibold text-white">Add to Cart</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="px-5 py-4">
      <View className="flex-row items-center justify-between rounded-2xl py-3.5 pl-4 pr-5" style={{ backgroundColor: BAR_BLUE }}>
        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => decrementItem(id)} hitSlop={8}>
            <AppIcon icon={MinusSignIcon} size={18} color="#FFFFFF" />
          </Pressable>
          <Text className="min-w-[20px] text-center text-base font-extrabold text-white">
            {quantity < 10 ? `0${quantity}` : quantity}
          </Text>
          <Pressable onPress={() => incrementItem(id)} hitSlop={8}>
            <AppIcon icon={AddSquareIcon} size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text className="text-base font-medium text-white">Added</Text>
      </View>
    </View>
  );
}
