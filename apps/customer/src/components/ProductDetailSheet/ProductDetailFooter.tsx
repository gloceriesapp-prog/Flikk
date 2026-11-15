import { useProductAvailability } from '../../screens/home/products/useProductAvailability';

import {
  MinusSignIcon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';

import { HugeiconsIcon } from '@hugeicons/react-native';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { PreorderQuantitySelector } from './PreorderQuantitySelector';

import { canAddFlavourPack } from '../FlavourPicker/flavourStock';
import { flavourPrice } from '../FlavourPicker/flavourPricing';
import { ProductPriceRow } from '../ProductPriceRow';
import { AppIcon } from '../AppIcon';

import { useCartStore } from '../../store/useCartStore';
import { addToCart } from '../../store/addToCart';
import { CUT_SIZE_LABEL, SERVING_LABEL, cartLineId, type CutSize, type Serving } from '../../store/cartIdentity';
import type { CartPreorder } from '../../store/preorder';
import { preorderMinimumLabel } from '../../store/preorderQuantity';

import type { Product, ProductOption } from '../../screens/home/products/types';

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
    availableQuantity?: number;
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
  // No added option means the original product. Real flavours must be in stock.
  const needsFlavour = option?.isAvailable === false;

  const weight =
    selectedVariant?.label ?? product.weight;

  const { price, originalPrice } = flavourPrice(product, option, selectedVariant);
  const selectionLabel = [weight, cutSize ? CUT_SIZE_LABEL[cutSize] : null, option?.name,
    serving ? SERVING_LABEL[serving] : null, product.preorder ? preorderMinimumLabel(product.preorder.minQty, weight) : null]
    .filter(Boolean).join(' · ');

  const quantity = useCartStore(
    (state) =>
      state.items.find((item) => item.id === id)?.quantity ?? 0
  );

  const minimum = product.preorder?.minQty ?? 1;
  const [selection, setSelection] = useState({ id, count: minimum });
  const count = selection.id === id ? Math.max(minimum, selection.count) : minimum;
  const stockPack = { id: variantId, availableQuantity: selectedVariant?.availableQuantity ?? product.availableQuantity };
  const needed = quantity === 0 && product.preorder ? count : 1;
  const canAdd = useCartStore(state => quantity + needed <= 999 && canAddFlavourPack(product, option, stockPack, state.items, needed));
  const canIncrease = useCartStore(state => count < 999 && canAddFlavourPack(product, option, stockPack, state.items, count + 1));
  const multiplier = product.preorder ? (quantity || count) : 1;
  const totalPrice = Math.round(price * multiplier * 100) / 100;
  const totalOriginalPrice = originalPrice == null ? undefined : Math.round(originalPrice * multiplier * 100) / 100;

  const incrementItem = useCartStore(
    (state) => state.incrementItem
  );

  const decrementItem = useCartStore(
    (state) => state.decrementItem
  );

  const unavailableLabel = selectedVariant?.isAvailable === false
    ? (selectedVariant.unavailableReason === 'stock_unconfirmed' ? 'Stock updating' : 'Out of stock')
    : availability.label ?? (needsFlavour ? 'Out of stock' : undefined);

  return (
    <View>
      {!unavailableLabel && product.preorder && quantity === 0 ? <PreorderQuantitySelector count={count} minimum={minimum} unit={weight}
        canIncrease={canIncrease} onChange={(next) => setSelection({ id, count: next })} /> : null}
    <View className="flex-row items-center justify-between px-5 pb-1 pt-3">
      {/* LEFT — PRICE */}
      <View className="flex-shrink" style={{ flex: 1, paddingRight: 12 }}>
        <Text numberOfLines={2} className="mb-1 text-[12px] font-medium text-ink/60">{selectionLabel}</Text>
        <ProductPriceRow price={totalPrice} originalPrice={totalOriginalPrice} size={18} />

        <Text className="mt-0.5 text-[11px] font-medium text-ink/50">
          {product.preorder ? `Total for ${quantity || count} × ${weight} · incl. taxes` : 'Inclusive of all taxes'}
        </Text>
      </View>

      {/* RIGHT */}
      {unavailableLabel ? (
        <Text className="text-right text-[14px] font-semibold text-[#B42318]">{unavailableLabel}</Text>
      ) : quantity === 0 && product.preorder && !preorder ? (
        /* PRE-ORDER: day + slot first */
        <View className="h-[42px] min-w-[128px] items-center justify-center rounded-xl bg-[#E5E7EB] px-5">
          <Text className="text-[13px] font-semibold text-ink/50">Pick day & slot</Text>
        </View>
      ) : quantity === 0 ? (
        /* ADD TO CART */
        <Pressable disabled={!canAdd}
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
            }, product.preorder ? preorder : undefined, product.preorder ? count : undefined)
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
            opacity: canAdd ? 1 : 0.45,
          }}
        >
          <Text className="text-[14px] font-semibold text-white">
            {product.preorder ? 'Add pre-order' : 'Add to Cart'}
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
            disabled={!canAdd} onPress={() => incrementItem(id)}
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
    </View>
  );
}
