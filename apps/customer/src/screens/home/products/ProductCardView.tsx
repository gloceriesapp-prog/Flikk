import { memo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { FlavourPickerSheet } from '../../../components/FlavourPicker/FlavourPickerSheet';
import { ProductImageGallery } from '../../../components/ProductImageGallery';
import { stockLabel } from '../../../components/stockLabel';
import { ProductPriceRow } from '../../../components/ProductPriceRow';
import { PriceHighlight } from './PriceHighlight';
import { ProductCardCartControl } from './ProductCardCartControl';
import { discountPercentLabel } from '../../../components/priceComparison';
import { cartLineId, quickAddCut, requiresProductSelection } from '../../../store/cartIdentity';
import { useCartStore } from '../../../store/useCartStore';
import { addToCart } from '../../../store/addToCart';
import { preorderMinimumLabel } from '../../../store/preorderQuantity';
import { useProductAvailability } from './useProductAvailability';
import type { Product } from './types';

interface Props {
  product: Product;
  widthClassName?: string;
  showDiscountBadge?: boolean;
  showImage?: boolean;
  // Smaller typography for narrow festival rails; actions keep one layout.
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
    isVeg,
  } = product;


  // Count real, distinct pack sizes, not photos or added flavours.
  const packs = product.variants?.length ? product.variants.map(variant => variant.label) : sizeOptions ?? [weight];
  const optionCount = Math.max(1, new Set(packs.map(label => label.trim().toLowerCase()).filter(Boolean)).size);
  const packCount = optionCount;
  const additionalSizeCount = packCount - 1;
  const sizeOptionLabel = weight.trim() && additionalSizeCount > 0
    ? `(${additionalSizeCount} ${additionalSizeCount === 1 ? 'option' : 'options'})` : null;
  const chooseOptions = requiresProductSelection(product);

  const discount = discountPercentLabel(price, originalPrice);
  const stockStatus = isAvailable
    ? stockLabel(product.availableQuantity, (product.availableQuantity ?? 0) < 5)
    : availabilityLabel ?? 'Unavailable';
  const cutSize = quickAddCut(product);
  const lineId = cartLineId(id, product.defaultVariantId, cutSize);
  const quantity = useCartStore((state) => state.items.find((item) => item.id === lineId)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  const cartControl = !isAvailable ? null : (
    <ProductCardCartControl name={name} quantity={quantity} chooseOptions={chooseOptions} compact={compact}
      onAdd={() => {
        if (chooseOptions) { onAdd?.(); return; }
        addToCart({ isAvailable, id: lineId, productId: id, variantId: product.defaultVariantId, cutSize, name, weight, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl });
      }}
      onIncrement={() => incrementItem(lineId)} onDecrement={() => decrementItem(lineId)} />
  );

  return (
    <Pressable onPress={onPress} className={`${widthClassName} gap-0`}>

      {/* Let the control overlap the outside corner; reserve space below it. */}
      {showImage && (
        <View className="relative mb-2">
          <View className="w-full overflow-hidden border border-[#E3E6EE] bg-[#F8F9FC]" style={{ borderRadius: 16, borderCurve: 'continuous' }}>
            <View className="aspect-[4/4.5] w-full">
              <ProductImageGallery images={product.imageUrls ?? (imageUrl ? [imageUrl] : [])} />
              {typeof isVeg === 'boolean' && <View pointerEvents="none" className="absolute right-2 top-2 rounded-[3px] border bg-white p-0.5" style={{ borderColor: isVeg ? '#00A650' : '#E23744' }}>
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isVeg ? '#00A650' : '#E23744' }} />
              </View>}
            </View>
            <View className="h-10 flex-row items-center justify-between gap-1 border-t border-[#E3E6EE] px-2">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={2} className="text-[11px] font-bold leading-[14px] text-[#333840]">{weight}</Text>
                {sizeOptionLabel && <Text className="text-[9px] font-medium leading-[12px] text-[#73809B]">{sizeOptionLabel}</Text>}
              </View>
            </View>
          </View>
          {cartControl && <View className="absolute z-10" style={{ right: -6, bottom: -2, paddingTop: 1, paddingHorizontal: 1, borderRadius: 26, backgroundColor: '#FFFFFF' }}>{cartControl}</View>}
        </View>
      )}

      {/* Pricing, name and stock keep their existing hierarchy. */}
      <View className="gap-1 px-0.5 pt-0">
        {!showImage && <View>
          <Text className={`text-[11px] font-semibold ${onDark ? 'text-white/70' : 'text-black/65'}`}>{weight}</Text>
          {sizeOptionLabel && <Text className={`text-[9px] font-medium leading-[12px] ${onDark ? 'text-white/60' : 'text-[#73809B]'}`}>{sizeOptionLabel}</Text>}
        </View>}

        {/* Price, discount and per-kg/litre price read as one block: no gap
            between them, and only a small gap before the product name. */}
        <View>
          <ProductPriceRow price={price} originalPrice={originalPrice} size={17} onDark={onDark} showDiscount={false} />
          {/* Discount and freshness tag share one line under the price (so the
              price row never shrinks); with both, they take turns. */}
          <PriceHighlight discount={discount} freshnessTag={freshnessTag} onDark={onDark} />
          {product.unitPriceLabel && (
            <Text className={`text-[11px] font-medium leading-[14px] ${onDark ? 'text-white/60' : 'text-[#6B7280]'}`}>{product.unitPriceLabel}</Text>
          )}
        </View>

        <Text className={`${Platform.OS === 'ios' ? 'text-[14px] leading-[18px]' : 'text-[13px] leading-[17px]'} font-semibold ${onDark ? 'text-white' : 'text-[#1F2937]'}`} numberOfLines={3}>
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
      {!showImage && cartControl && <View className="mt-2 self-end">{cartControl}</View>}
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
