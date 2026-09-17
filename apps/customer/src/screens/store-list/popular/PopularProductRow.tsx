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
import { Add01Icon, AddSquareIcon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
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
        className="items-center justify-center rounded-[12px] border px-4 py-1.5 border border-[#155dfc]"
      >
        <Text className="text-[12.5px] font-semibold text-[#155dfc]">
          ADD
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center gap-2.5 rounded-lg px-2 py-1.5 bg-white border border-[#155dfc]">
      <Pressable onPress={() => decrementItem(product.id)} hitSlop={8}>
        <AppIcon icon={MinusSignIcon} size={14} color="#155dfc" />
      </Pressable>
      <Text className="min-w-[14px] text-center text-[12.5px] font-bold text-[#155dfc]">{quantity}</Text>
      <Pressable onPress={() => incrementItem(product.id)} hitSlop={8}>
        <AppIcon icon={Add01Icon} size={14} color="#155dfc" />
      </Pressable>
    </View>
  );
}

export function PopularProductRow({ product }: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <>
      {/* Image | title (2 lines) + weight | AddControl | price column —
          image/title/weight are one Pressable opening the detail sheet,
          AddControl and the price readout sit outside it as their own
          non-nested touch targets (AddControl's own header note on why). */}
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable onPress={() => setIsDetailOpen(true)} className="flex-1 flex-row items-center gap-3">
          <Image
            source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }}
            className="h-14 w-14 rounded-xl bg-mist"
            contentFit="cover"
          />
          <View className="flex-1 gap-1">
            <Text className="text-[14.5px] font-medium text-ink" numberOfLines={2}>
              {product.name}
            </Text>
            <Text className="text-[12.5px] font-medium text-ink/50">{product.weight}</Text>
          </View>
        </Pressable>

        {/* AddControl and the price column share a tighter gap of their
            own (gap-1), separate from the outer row's gap-3 that spaces
            the title block away from them — these two read as one paired
            unit (what to tap, what it costs), not two independent row
            sections that need the same breathing room as image-to-title. */}
        <View className="flex-row items-center gap-1">
          <AddControl product={product} />

          {/* Right-aligned again — price belongs flush at the row's true
              end, not tucked next to AddControl — but the box is now just
              wide enough for the actual widest realistic value (₹1000-ish,
              44px) instead of a looser 56px, so a short ₹14 doesn't leave
              much dead space to its own left before landing at that right
              edge. Fixed width is still what matters for AddControl's own
              alignment (this column's own earlier note): a plain ₹14 vs. a
              two-line ₹48/₹45 discount block render at different natural
              widths, and since this column sits AFTER AddControl, letting
              it size to its own content shrinks the title's flex-1 space
              by a different amount per row, which shifts AddControl's own
              x position left/right instead of it staying in one line. */}
          <View className="items-end gap-0.5" style={{ width: 44 }}>
            {product.originalPrice && product.originalPrice > product.price ? (
              <Text className="text-[12px] font-medium text-ink/40 line-through" numberOfLines={1}>
                ₹{product.originalPrice}
              </Text>
            ) : null}
            <Text className="text-[14.5px] font-semibold text-ink" numberOfLines={1}>
              ₹{product.price}
            </Text>
          </View>
        </View>
      </View>
      <ProductDetailSheet product={product} visible={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
}
