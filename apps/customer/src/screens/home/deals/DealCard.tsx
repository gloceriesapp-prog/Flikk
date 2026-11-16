// One "Biggest Price Drops" card. The saving leads (a green "% OFF" band on top),
// then price against MRP, name and pack size.
// The add control sits on the image corner like the other Home product cards.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';
import { discountPercentLabel, priceComparison } from '../../../components/priceComparison';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { addToCart } from '../../../store/addToCart';
import { useCartStore } from '../../../store/useCartStore';
import { cartLineId, quickAddCut, mustPickInDetail } from '../../../store/cartIdentity';
import { useProductAvailability } from '../products/useProductAvailability';
import type { Product } from '../products/types';

const CARD_WIDTH = 156;
const BLUE = '#155DFC';
const SAVING_GREEN = '#00A650';
const NON_VEG_RED = '#E23744';
const PANEL_HEIGHT = 158;
const CARD_RADIUS = 20;
const PANEL_TOP_RADIUS = 17;
// Add control: evenly rounded on every corner.
const CORNER = { borderRadius: 12 };

const TICKET_BLUE = '#1D3B9E';
const NOTCHES = [0, 1, 2, 3, 4];

// Price on a ticket stub: a soft blue fill with scalloped left and right edges,
// cut by small circles in the white page colour behind it.
function PriceTicket({ price }: { price: number }) {
  // Measured size: percentage sizes on an absolute Svg only painted part of the stub.
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View className="flex-shrink-0 overflow-hidden rounded-[4px] px-3 py-1"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={size.width} height={size.height}>
        <Defs>
          <LinearGradient id="ticket" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#C9D6FF" />
            <Stop offset="1" stopColor="#E8EEFF" />
          </LinearGradient>
        </Defs>
        <Rect width={size.width} height={size.height} fill="url(#ticket)" />
      </Svg>
      {(['left', 'right'] as const).map((side) => (
        <View key={side} className="absolute bottom-0 top-0 justify-evenly" style={{ [side]: -2.5 }}>
          {NOTCHES.map((n) => <View key={n} className="h-[5px] w-[5px] rounded-full bg-white" />)}
        </View>
      ))}
      <Text numberOfLines={1} className="text-[18px] font-extrabold" style={{ color: TICKET_BLUE, lineHeight: 22 }}>₹{price}</Text>
    </View>
  );
}

export function DealCard({ product }: { product: Product }) {
  const { id, name, weight, price, originalPrice, imageUrl, storeId, storeName, isVeg } = product;
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { mrp } = priceComparison(price, originalPrice);
  const percentOff = discountPercentLabel(price, originalPrice);

  const cutSize = quickAddCut(product);
  const lineId = cartLineId(id, product.defaultVariantId, cutSize);
  const availability = useProductAvailability(product);
  const quantity = useCartStore((state) => state.items.find((item) => item.id === lineId)?.quantity ?? 0);
  const incrementItem = useCartStore((state) => state.incrementItem);
  const decrementItem = useCartStore((state) => state.decrementItem);

  function handleAdd() {
    // Flavours / chilled-or-not: open the detail view to pick.
    if (mustPickInDetail(product)) { setIsDetailOpen(true); return; }
    addToCart({
      isAvailable: availability.isAvailable, id: lineId, productId: id, variantId: product.defaultVariantId, cutSize,
      name, weight, price, originalPrice, storeId: storeId ?? '', storeName, imageUrl,
    });
  }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={() => setIsDetailOpen(true)}
        style={{ width: CARD_WIDTH }} className="active:opacity-90">
        {/* Green card: the saving in its top band, then the product on a grey,
            bordered image panel (like the other product cards) that spans the
            full width with rounded top corners. */}
        <View>
          <View className="overflow-hidden" style={{ borderRadius: CARD_RADIUS, backgroundColor: SAVING_GREEN }}>
            <View className="h-[32px] items-center justify-center" style={{ backgroundColor: SAVING_GREEN }}>
              <Text className="text-[14px] font-extrabold text-white" style={{ letterSpacing: 0.3 }}>
                {percentOff ? `${percentOff}% OFF` : 'PRICE DROP'}
              </Text>
            </View>
            <View className="overflow-hidden border border-[#E5E7EB] bg-[#F9FAFB]"
              style={{ height: PANEL_HEIGHT, borderTopLeftRadius: PANEL_TOP_RADIUS, borderTopRightRadius: PANEL_TOP_RADIUS, borderBottomLeftRadius: CARD_RADIUS, borderBottomRightRadius: CARD_RADIUS }}>
              <Image source={{ uri: imageUrl || PLACEHOLDER_IMAGE_URI }} style={{ position: 'absolute', top: 10, right: 10, bottom: 10, left: 10 }} contentFit="contain" />
              {/* Veg / non-veg mark, standard Indian food-label convention.
                  Only when set in Admin. */}
              {isVeg !== undefined && (
                <View className="absolute bottom-2.5 left-2.5 h-[16px] w-[16px] items-center justify-center rounded-[3px] border-[1.5px] bg-white"
                  style={{ borderColor: isVeg ? SAVING_GREEN : NON_VEG_RED }}>
                  <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: isVeg ? SAVING_GREEN : NON_VEG_RED }} />
                </View>
              )}
            </View>
          </View>
          {/* Add control on the panel's bottom-right corner, sitting on its border.
            Outside the clipped card so the overlap is not cut off. */}
          <View className="absolute" style={{ right: -2, bottom: -2 }}>
            {!availability.isAvailable ? (
              <View className="bg-white px-3 py-2.5" style={CORNER}>
                <Text className="text-[12px] font-bold text-[#B42318]">{availability.label}</Text>
              </View>
            ) : quantity === 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Add ${name} to cart`} hitSlop={6}
                onPress={(event) => { event.stopPropagation(); handleAdd(); }}
                className="h-10 min-w-[76px] items-center justify-center border bg-white px-4 active:opacity-80" style={[CORNER, { borderColor: BLUE }]}>
                <Text className="text-[15px] font-extrabold" style={{ color: BLUE }}>ADD</Text>
              </Pressable>
            ) : (
              <View className="h-10 w-[96px] flex-row items-center justify-between px-1.5" style={[CORNER, { backgroundColor: BLUE }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${name}`} hitSlop={8}
                  onPress={(event) => { event.stopPropagation(); decrementItem(lineId); }} className="h-10 w-7 items-center justify-center">
                  <AppIcon icon={MinusSignIcon} size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
                <Text className="text-[15px] font-extrabold text-white">{quantity}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${name}`} hitSlop={8}
                  onPress={(event) => { event.stopPropagation(); incrementItem(lineId); }} className="h-10 w-7 items-center justify-center">
                  <AppIcon icon={Add01Icon} size={16} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View className="px-0.5 pt-2.5">
          {/* Selling price on a ticket stub, MRP struck through beside it. */}
          <View className="flex-row items-center gap-1.5">
            <PriceTicket price={price} />
            {mrp !== undefined && (
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} className="flex-1 text-[12px] font-medium text-ink/45">
                MRP <Text style={{ textDecorationLine: 'line-through' }}>₹{mrp}</Text>
              </Text>
            )}
          </View>
          <Text numberOfLines={2} className="mt-1 text-[13px] font-semibold leading-[17px] text-[#1F2937]">{name}</Text>
          {!!weight && <Text numberOfLines={1} className="mt-0.5 text-[12px] font-medium text-ink/45">{weight}</Text>}
        </View>
      </Pressable>

      <ProductDetailSheet product={product} visible={isDetailOpen} onClose={() => setIsDetailOpen(false)} />
    </>
  );
}
