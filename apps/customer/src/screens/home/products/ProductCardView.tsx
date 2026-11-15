import { memo, useState } from 'react';
import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { FlavourPickerSheet } from '../../../components/FlavourPicker/FlavourPickerSheet';
import { ProductImageGallery } from '../../../components/ProductImageGallery';
import { AppIcon } from '../../../components/AppIcon';
import { stockLabel } from '../../../components/stockLabel';
import { ProductPriceRow } from '../../../components/ProductPriceRow';
import { discountPercentLabel } from '../../../components/priceComparison';
import { cartLineId, quickAddCut, mustPickInDetail } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';
import { addToCart } from '../../../store/addToCart';
import { preorderMinimumLabel } from '../../../store/preorderQuantity';
import { useProductAvailability } from './useProductAvailability';
import type { Product } from './types';

// Categories where a veg/non-veg mark is meaningful — only these show the dot.
// (veg/non-veg indicator removed from the card per design)

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  showImage?: boolean;
  // Festival-rail variant: ADD button is a bold + icon (not text).
  // Every other Home row leaves this off and keeps the full card.
  compact?: boolean;
  // Festival panel sits on a dark maroon bg — switch the background-less
  // detail text (name/price/%OFF) to light treatments so it stays readable.
  // Everything with its own light chip/pill bg is left untouched.
  onDark?: boolean;
  onPress?: () => void;
  onAdd?: () => void;
  // Kept for existing section callers; product cards no longer show ETA.
  // Lifted from the parent section so one shared 30s browse-clock tick / a
  // delivery-settings refetch re-renders the section node once instead of
  // every card. ProductCard supplies these — either passing a section's
  // lifted values straight through, or self-subscribing for standalone
  // placements outside a big grid. Passed as primitives (not the availability
  // object) so React.memo's default shallow compare bails on a tick that
  // didn't actually change this card's availability.
  estimatedMinutes?: number;
  isAvailable: boolean;
  availabilityLabel?: string;
}

function ProductCardViewImpl({ product, widthClassName = 'w-[32%]', showImage = true, compact = false, onDark = false, onPress, onAdd, isAvailable, availabilityLabel }: Props) {
  const {
    id,
    name,
    weight,
    price,
    originalPrice,
    imageUrl,
    freshnessTag,
    sizeOptions,
    storeId,
    storeName,
    isVeg = true,
  } = product;


  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize] = useState(chips[0]);

  const discount = discountPercentLabel(price, originalPrice);
  const stockStatus = isAvailable
    ? stockLabel(product.availableQuantity, (product.availableQuantity ?? 0) < 5)
    : availabilityLabel ?? 'Unavailable';
  const cutSize = quickAddCut(product);
  const lineId = cartLineId(id, product.defaultVariantId, cutSize);
  const quantity = useCartStore((state) => state.items.find((item) => item.id === lineId)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  const cartControl = !isAvailable ? null : quantity === 0 || !!product.options?.length ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${name} to cart`}
      onPress={(event) => {
        event.stopPropagation();
        if (product.options?.length && onAdd) { onAdd(); return; }
        if (mustPickInDetail(product)) {
          onPress?.();
          return;
        }
        addToCart({ isAvailable, id: lineId, productId: id, variantId: product.defaultVariantId, cutSize, name, weight: selectedSize, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl });
      }}
      className={`items-center justify-center rounded-[8px] border border-[#155dfc] bg-white py-2 px-3 `}
    >
      {compact ? (
        <AppIcon icon={Add01Icon} size={18} color="#241712" fill="#155dfc" strokeWidth={3.5} />
      ) : (
        <AppIcon icon={Add01Icon} size={20} color="#155dfc" fill="#155dfc" strokeWidth={3} />
      )}
    </Pressable>
  ) : (
    <View className="flex-row items-center gap-2.5 rounded-[8px] border border-[#155dfc] bg-white px-3 py-2">
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${name}`} onPress={() => decrementItem(lineId)} hitSlop={12}>
        <AppIcon icon={MinusSignIcon} size={20} color="#155dfc" strokeWidth={2.5} />
      </Pressable>
      <Text className="min-w-[12px] text-center text-[13px] font-extrabold text-[#155dfc]">{quantity}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${name}`} onPress={() => incrementItem(lineId)} hitSlop={12}>
        <AppIcon icon={Add01Icon} size={20} color="#155dfc" strokeWidth={2.5} />
      </Pressable>
    </View>
  );

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-0`}>

      {/* Pin the cart control to the image when it is visible. */}
      {showImage && (
        <View className="relative mb-2">
          <View className="aspect-[4/4.5] w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
            <ProductImageGallery images={product.imageUrls ?? (imageUrl ? [imageUrl] : [])} />
          </View>

          {freshnessTag && (
            <View className="absolute left-0 top-2 rounded-r-full bg-gold py-0.5 pl-1.5 pr-2">
              <Text className="text-[9px] font-semibold text-ink">{freshnessTag}</Text>
            </View>
          )}

          <View className="absolute bottom-0 right-0 z-10">{cartControl}</View>
        </View>
      )}

      {/* Pack, price and product name, followed by confirmed low stock. */}
      <View className="gap-1 px-0.5 pt-0">
        {/* Dietary mark in its own tile on the left; the pack size fills the
            rest of the row, centred. Both tiles share one height and tint. */}
        <View className="mb-0.5 flex-row items-center gap-1.5">
          {/* Veg / non-veg mark — square outline + center dot, standard Indian
              food-label convention. isVeg defaults true (types.ts), only
              fish/meat set it false. */}
          <View className="h-[22px] w-[26px] items-center justify-center rounded-[6px] bg-[#F1F1F4]">
            <View
              className="h-3.5 w-3.5 items-center justify-center rounded-[3px] border bg-white"
              style={{ borderColor: isVeg ? '#00A650' : '#E23744' }}
            >
              <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: isVeg ? '#00A650' : '#E23744' }} />
            </View>
          </View>
          <View className="h-[22px] flex-1 items-center justify-center rounded-[6px] bg-[#F1F1F4] px-1.5">
            <Text numberOfLines={1} className="text-[11px] font-semibold text-black/65">{weight}</Text>
          </View>
        </View>

        <ProductPriceRow price={price} originalPrice={originalPrice} size={17} onDark={onDark} showDiscount={false} />
        {/* Discount on its own line under the price, so the price row never shrinks to fit it. */}
        {discount ? (
          <Text className={`text-[12px] font-bold leading-[15px] ${onDark ? 'text-[#8FE3B0]' : 'text-[#00A650]'}`}>{discount}% off</Text>
        ) : null}

        {/* Per-kg/litre price, right under the amount. */}
        {product.unitPriceLabel && (
          <Text className={`text-[11px] font-medium ${onDark ? 'text-white/60' : 'text-[#6B7280]'}`}>{product.unitPriceLabel}</Text>
        )}

        <Text className={`text-[13px] font-semibold leading-[17px] ${onDark ? 'text-white' : 'text-[#1F2937]'}`} numberOfLines={3}>
          {name}
        </Text>
        {stockStatus ? (
          <Text className="text-[11px] font-semibold leading-[15px]" style={{ color: onDark ? '#FFB4AB' : '#D92D20' }}>{stockStatus}</Text>
        ) : null}
        {/* Preserve the pre-order minimum; delivery estimates live in the header. */}
        {product.preorder ? (
          <View className={`self-start rounded-md px-1.5 py-0.5 ${onDark ? 'bg-white/15' : 'bg-[#F1EAF4]'}`}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} className={`text-[10px] font-semibold ${onDark ? 'text-white' : 'text-[#4A2C5A]'}`}>{preorderMinimumLabel(product.preorder.minQty, product.weight)}</Text>
          </View>
        ) : null}
      </View>
      {!showImage && cartControl && <View className="mt-2 self-start">{cartControl}</View>}
    </Pressable>
  );
}

// Memoized: this is the heavy presentational node (full View/Text tree +
// NativeWind class processing + icons). Default shallow compare is correct —
// every prop is a primitive or a referentially-stable value: `product` keeps
// its identity across browse-clock ticks (the list array isn't rebuilt), and
// `onPress` is a useCallback in ProductCard. The per-card cart store
// subscriptions still live inside, so quantity changes re-render as
// before; only the shared clock + delivery-settings subscriptions were lifted
// out to the section.
export const ProductCardView = memo(ProductCardViewImpl);

// Self-subscribing presentational card: for the few places that render the
// card WITHOUT ProductCard's tap-to-open detail sheet (preview/sample tiles,
// the similar-products grid inside the detail sheet). It owns the clock +
// delivery-settings subscription so those call sites don't duplicate it, and
// still feeds the memoized view primitives (so a tick that doesn't change this
// product's availability won't re-render the heavy node). NOT for big grids —
// there a section lifts the subscription once and feeds ProductCard.
export function SelfServiceProductCardView(
  props: Omit<Props, 'estimatedMinutes' | 'isAvailable' | 'availabilityLabel'>,
) {
  const availability = useProductAvailability(props.product);
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <><ProductCardView
      {...props}
      onAdd={() => setPickerOpen(true)}
      isAvailable={availability.isAvailable}
      availabilityLabel={availability.label}
    /><FlavourPickerSheet product={props.product} visible={pickerOpen} onClose={() => setPickerOpen(false)} isAvailable={availability.isAvailable} availabilityLabel={availability.label} /></>
  );
}
