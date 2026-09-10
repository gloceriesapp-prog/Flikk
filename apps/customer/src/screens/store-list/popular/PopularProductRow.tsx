// One row inside a PopularStorePanel — real product photo/name/price on
// the left (tapping opens ProductDetailSheet, same mechanism ProductCard.tsx
// uses everywhere else), and a real quick-add control on the right per an
// explicit ask — not nested inside the same Pressable as the rest of the
// row (two separate touch targets, not one Pressable swallowing the
// other's taps): tapping ADD calls the exact same store/addToCart.ts
// helper every other ADD button in this app uses (cross-store-conflict
// Alert included), and once the product's actually in the cart this turns
// into the same -/qty/+ stepper ProductDetailFooter.tsx already shows,
// reading real quantity from useCartStore rather than tracking its own.
//
// "View cart" showing up: BottomNavBar.tsx already renders CartBar
// unconditionally the moment the cart has any item (CartBar.tsx's own
// `if (totalQuantity === 0) return null`) — StoreListScreen.tsx already
// renders BottomNavBar, so adding an item here surfaces it for free, no
// new wiring needed on this screen.
//
// The "FLAT X% OFF" tag is real — computed from the product's own price/
// originalPrice (never fabricated), and only shown when a discount
// actually exists (useStorePopularProducts.ts only ever returns real
// deals, so every row here has one, but the guard stays in case that ever
// changes).

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { addToCart } from '../../../store/addToCart';
import { useCartStore } from '../../../store/useCartStore';
import type { Product } from '../../home/products/types';

interface Props {
  product: Product;
}

function AddControl({ product }: { product: Product }) {
  const quantity = useCartStore((state) => state.items.find((item) => item.id === product.id)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  if (quantity === 0) {
    return (
      <Pressable
        onPress={() =>
          addToCart({
            id: product.id,
            name: product.name,
            weight: product.weight,
            price: product.price,
            originalPrice: product.originalPrice,
            storeId: product.storeId ?? '',
            storeName: product.storeName,
            imageUrl: product.imageUrl,
          })
        }
        hitSlop={8}
        className="items-center justify-center rounded-lg border px-4 py-1.5 border-[#1447e6] bg-[#155dfc]/10"
      >
        <Text className="text-[12.5px] font-bold text-[#1447e6]">
          ADD
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-2.5 rounded-lg px-2 py-1.5" style={{ backgroundColor: colors.coral }}>
      <Pressable onPress={() => decrementItem(product.id)} hitSlop={8}>
        <AppIcon icon={MinusSignIcon} size={14} color="#FFFFFF" />
      </Pressable>
      <Text className="min-w-[14px] text-center text-[12.5px] font-extrabold text-white">{quantity}</Text>
      <Pressable onPress={() => incrementItem(product.id)} hitSlop={8}>
        <AppIcon icon={AddSquareIcon} size={14} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export function PopularProductRow({ product }: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : undefined;

  return (
    <>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable onPress={() => setIsDetailOpen(true)} className="flex-1 flex-row items-center gap-3">
          <Image
            source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }}
            className="h-14 w-14 rounded-xl bg-mist"
            contentFit="cover"
          />
          <View className="flex-1 gap-1">
            <Text className="text-[14.5px] font-medium text-ink" numberOfLines={1}>
              {product.name}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[13px] font-semibold text-ink">₹{product.price}</Text>
              {product.originalPrice ? (
                <Text className="text-[12px] font-medium text-ink/40 line-through">₹{product.originalPrice}</Text>
              ) : null}
            </View>
            {discountPercent ? (
              <Text className="text-[12px] font-semibold" style={{ color: colors.limeDeep }}>
                {discountPercent}% OFF
              </Text>
            ) : null}
          </View>
        </Pressable>

        <AddControl product={product} />
      </View>
      <ProductDetailSheet product={product} visible={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
}
