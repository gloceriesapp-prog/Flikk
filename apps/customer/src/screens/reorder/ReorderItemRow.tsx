// One Re-order row: photo, name, pack and today's price; "Re-order" on the
// right adds it again (same addToCart as every ADD button), then turns into
// the -/qty/+ stepper. Products with choices (packs, flavours, pre-order
// slot) open the same picker the product cards use. Tapping the row opens
// the product details.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { AppImage as Image } from '../../components/AppImage';
import { RupeePrice } from '../../components/RupeePrice';
import { FlavourPickerSheet } from '../../components/FlavourPicker/FlavourPickerSheet';
import { ProductDetailSheet } from '../../components/ProductDetailSheet/ProductDetailSheet';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { addToCart } from '../../store/addToCart';
import { cartLineId, quickAddCut, requiresProductSelection } from '../../store/cartIdentity';
import { useCartStore } from '../../store/useCartStore';
import { productAvailability } from '../../utils/productAvailability';
import type { Product } from '../home/products/types';
import { actionColors } from '../../theme/tokens';

const BLUE = actionColors.fill;
// Same photo frame as the product cards: first gallery photo, cover-fit on
// the light card surface with its hairline border.
const PHOTO_SIZE = 88;

export function ReorderItemRow({ product }: { product: Product }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const availability = productAvailability(product);
  const choose = requiresProductSelection(product);
  const cutSize = quickAddCut(product);
  const lineId = cartLineId(product.id, product.defaultVariantId, cutSize);
  const quantity = useCartStore((state) => state.items.find((item) => item.id === lineId)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  const photo = product.imageUrls?.[0] || product.imageUrl || PLACEHOLDER_IMAGE_URI;
  const reorder = () => choose ? setPickerOpen(true) : addToCart({
    isAvailable: availability.isAvailable, id: lineId, productId: product.id, category: product.categoryLabel, variantId: product.defaultVariantId, cutSize,
    name: product.name, weight: product.weight, price: product.price, originalPrice: product.originalPrice,
    storeId: product.storeId ?? '', storeName: product.storeName, imageUrl: product.imageUrl,
  });

  return (
    <>
      <View className="flex-row items-center gap-3.5 px-4 py-4">
        <Pressable onPress={() => setDetailOpen(true)} className="flex-1 flex-row items-center gap-3.5">
          <View className="overflow-hidden border border-[#E3E6EE] bg-[#F8F9FC]"
            style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 16, borderCurve: 'continuous' }}>
            <Image source={{ uri: photo }} className="h-full w-full" resizeMode="cover" enforceEarlyResizing cachePolicy="memory-disk"
              accessibilityLabel={product.name} />
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-[16px] font-semibold leading-[21px] text-ink" numberOfLines={2}>{product.name}</Text>
            <Text className="text-[14px] font-medium text-ink/50" numberOfLines={1}>{product.weight}</Text>
            <View className="flex-row items-center gap-1.5">
              <RupeePrice amount={product.price} size={17} numberOfLines={1} />
              {product.originalPrice && product.originalPrice > product.price
                ? <RupeePrice amount={product.originalPrice} size={13.5} strike color="#101C1066" numberOfLines={1} /> : null}
            </View>
          </View>
        </Pressable>

        {!availability.isAvailable ? (
          <Text className="w-[108px] text-center text-[13.5px] font-bold text-[#B42318]">{availability.label ?? 'Unavailable'}</Text>
        ) : quantity > 0 && !choose ? (
          <View className="h-12 w-[108px] flex-row items-center justify-between rounded-2xl px-3" style={{ backgroundColor: BLUE }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${product.name}`} onPress={() => decrementItem(lineId)} hitSlop={10}>
              <AppIcon icon={MinusSignIcon} size={19} color="#FFFFFF" />
            </Pressable>
            <Text className="text-[16px] font-bold text-white">{quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${product.name}`} onPress={() => incrementItem(lineId)} hitSlop={10}>
              <AppIcon icon={Add01Icon} size={19} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`Re-order ${product.name}`} onPress={reorder}
            className="h-12 w-[108px] items-center justify-center rounded-2xl border-[1.5px] active:opacity-70" style={{ borderColor: BLUE }}>
            <Text className="text-[16px] font-bold" style={{ color: BLUE }}>Re-order</Text>
          </Pressable>
        )}
      </View>
      <FlavourPickerSheet product={product} visible={pickerOpen} onClose={() => setPickerOpen(false)}
        isAvailable={availability.isAvailable} availabilityLabel={availability.label}  onOpenDetails={() => setDetailOpen(true)} />
      <ProductDetailSheet product={product} visible={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  );
}
