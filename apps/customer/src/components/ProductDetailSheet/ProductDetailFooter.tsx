import { useProductAvailability } from '../../screens/home/products/useProductAvailability';

import {
  MinusSignIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';

import { HugeiconsIcon } from '@hugeicons/react-native';
import { Pressable, Text, View } from 'react-native';

import { RupeePrice } from '../RupeePrice';
import { AppIcon } from '../AppIcon';

import { useCartStore } from '../../store/useCartStore';
import { addToCart } from '../../store/addToCart';
import { CUT_SIZE_LABEL, SERVING_LABEL, cartLineId, type CutSize, type Serving } from '../../store/cartIdentity';
import type { CartPreorder } from '../../store/preorder';

import type { Product, ProductOption } from '../../screens/home/products/types';
import { discountPercentOf } from './ProductVariantOptions';

const BAR_BLUE = '#1447e6';

interface Props {
  product: Product;

  selectedVariant?: {
    isAvailable?: boolean;
    unavailableReason?: Product['unavailableReason'];
    id: string;
    label: string;
    price: number;
    originalPrice?: number;
  };
  // Chosen chicken cut (ProductCutOptions); a separate cart line per cut.
  cutSize?: CutSize;
  // Chosen flavour (ProductFlavourOptions); a separate cart line per flavour.
  option?: ProductOption;
  // Chilled / room temperature (ProductServingOptions); set only when the
  // product offers both, a separate cart line each.
  serving?: Serving;
  // Pre-order products: the chosen day + slot; none picked = can't add yet.
  preorder?: CartPreorder;
}

export function ProductDetailFooter({
  product,
  selectedVariant,
  cutSize,
  option,
  serving,
  preorder,
}: Props) {
  const availability = useProductAvailability(product);

  const {
    name,
    storeId,
    storeName,
    imageUrl,
  } = product;

  const variantId =
    selectedVariant?.id ?? product.defaultVariantId;

  const id = cartLineId(product.id, variantId, cutSize, option?.id, serving);
  // A product with flavours goes in the cart only with an in-stock one picked.
  const needsFlavour = (product.options?.length ?? 0) > 0 && !option?.isAvailable;

  const weight =
    selectedVariant?.label ?? product.weight;

  const price =
    selectedVariant?.price ?? product.price;

  const originalPrice =
    selectedVariant?.originalPrice ?? product.originalPrice;
  const discount = discountPercentOf(price, originalPrice);
  const selectionLabel = [weight, cutSize ? CUT_SIZE_LABEL[cutSize] : null, option?.name,
    serving ? SERVING_LABEL[serving] : null, product.preorder ? `Min ${product.preorder.minQty}` : null]
    .filter(Boolean).join(' · ');

  const quantity = useCartStore(
    (state) =>
      state.items.find((item) => item.id === id)?.quantity ?? 0
  );

  const incrementItem = useCartStore(
    (state) => state.incrementItem
  );

  const decrementItem = useCartStore(
    (state) => state.decrementItem
  );

  // OUT OF STOCK / UNAVAILABLE
  if (
    !availability.isAvailable ||
    selectedVariant?.isAvailable === false ||
    needsFlavour
  ) {
    return (
      <View className="mx-5 my-4 rounded-2xl bg-[#FFF0EE] px-5 py-4">
        <Text className="text-center font-bold text-[#B42318]">
          {needsFlavour && availability.isAvailable && selectedVariant?.isAvailable !== false
            ? 'Every flavour is out of stock'
            : selectedVariant?.isAvailable === false
            ? selectedVariant.unavailableReason === 'stock_unconfirmed'
              ? 'Stock updating'
              : 'Out of stock'
            : availability.label}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between px-5 pb-1 pt-3">
      {/* LEFT — PRICE */}
      <View className="flex-shrink" style={{ flex: 1, paddingRight: 12 }}>
        <Text numberOfLines={2} className="mb-1 text-[12px] font-medium text-ink/60">{selectionLabel}</Text>
        <View className="flex-row items-end gap-2" style={{ flexWrap: 'wrap' }}>
          <RupeePrice
            amount={price}
            size={22}
          />

          {originalPrice != null &&
            originalPrice > price && (
              <RupeePrice
                amount={originalPrice}
                size={14}
                strike
                color="#101C1066"
                style={{
                  paddingBottom: 2,
                }}
              />
            )}
          {discount != null && discount > 0 && (
            <Text className="pb-0.5 text-[12px] font-bold text-[#16A34A]">{discount}% off</Text>
          )}
        </View>

        <Text className="mt-0.5 text-[11px] font-medium text-ink/50">
          Inclusive of all taxes
        </Text>
      </View>

      {/* RIGHT */}
      {quantity === 0 && product.preorder && !preorder ? (
        /* PRE-ORDER: day + slot first */
        <View className="h-[42px] min-w-[128px] items-center justify-center rounded-xl bg-[#E5E7EB] px-5">
          <Text className="text-[13px] font-semibold text-ink/50">Pick day & slot</Text>
        </View>
      ) : quantity === 0 ? (
        /* ADD TO CART */
        <Pressable
          onPress={() =>
            addToCart({
              isAvailable: availability.isAvailable,
              id,
              productId: product.id,
              variantId,
              cutSize,
              optionId: option?.id,
              optionName: option?.name,
              serving,
              name,
              weight,
              price,
              originalPrice,
              storeId: storeId ?? '',
              storeName,
              imageUrl: option?.imageUrl ?? imageUrl,
              preorderMinQty: product.preorder?.minQty,
            }, product.preorder ? preorder : undefined)
          }
          className="
            h-[42px]
            min-w-[128px]
            items-center
            justify-center
            rounded-xl
            px-5
          "
          style={{
            backgroundColor: BAR_BLUE,
          }}
        >
          <Text className="text-[14px] font-semibold text-white">
            {product.preorder ? `Pre-order ${product.preorder.minQty}` : 'Add to Cart'}
          </Text>
        </Pressable>
      ) : (
        /* QUANTITY STEPPER */
        <View
          className="
            h-[42px]
            min-w-[128px]
            flex-row
            items-center
            justify-between
            rounded-xl
            border
            border-gray-300
            bg-[#F3F6FF]
            px-2
          "
          style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 4,

            // Android
            elevation: 2,
          }}
        >
          {/* MINUS */}
          <Pressable accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${name}`}
            onPress={() => decrementItem(id)}
            hitSlop={12}
            className="h-8 w-8 items-center justify-center"
          >
            <AppIcon
              icon={MinusSignIcon}
              size={17}
              color={BAR_BLUE}
            />
          </Pressable>

          {/* QUANTITY */}
          <Text
            className="
              min-w-[24px]
              text-center
              text-[14px]
              font-extrabold
            "
            style={{
              color: BAR_BLUE,
            }}
          >
            {quantity}
          </Text>

          {/* PLUS */}
          <Pressable accessibilityRole="button" accessibilityLabel={`Increase quantity of ${name}`}
            onPress={() => incrementItem(id)}
            hitSlop={12}
            className="h-8 w-8 items-center justify-center"
          >
            <HugeiconsIcon
              icon={PlusSignIcon}
              size={17}
              color={BAR_BLUE}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}
