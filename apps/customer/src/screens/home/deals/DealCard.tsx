import { useProductAvailability } from '../products/useProductAvailability';
import { cartLineId } from '../../../store/cartIdentity';
import { useState } from 'react';

import {
  Add01Icon,
  MinusSignIcon,
  TradeDownIcon,
} from '@hugeicons/core-free-icons';

import {
  Pressable,
  Text,
  View,
} from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';
import { RupeePrice } from '../../../components/RupeePrice';
import { ProductDetailSheet } from '../../../components/ProductDetailSheet/ProductDetailSheet';

import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';

import { addToCart } from '../../../store/addToCart';
import { useCartStore } from '../../../store/useCartStore';

import type { Product } from '../products/types';

import { AppIcon } from '../../../components/AppIcon';

/* ============================================================
   DESIGN
============================================================ */

const CARD_WIDTH = 174;

/*
 * Reduced from 174 → 150.
 *
 * Gives the card a more compact and premium proportion.
 */
const IMAGE_CARD_HEIGHT = 150;

/*
 * Single solid premium plum.
 */
const MAIN_CARD_COLOR = '#5B173E';

interface Props {
  product: Product;
}

export function DealCard({
  product,
}: Props) {
  const {
    id,
    name,
    weight,
    price,
    originalPrice,
    imageUrl,
    storeId,
    storeName,
  } = product;

  const [
    isDetailOpen,
    setIsDetailOpen,
  ] = useState(false);

  /* ==========================================================
     DEAL LOGIC
  ========================================================== */

  const hasDeal =
    typeof price === 'number' &&
    Number.isFinite(price) &&
    typeof originalPrice === 'number' &&
    Number.isFinite(originalPrice) &&
    originalPrice > price;

  const saveAmount = hasDeal
    ? Math.max(
      0,
      Math.round(
        originalPrice - price,
      ),
    )
    : 0;

  const discountPercent = hasDeal
    ? Math.min(
      100,
      Math.max(
        0,
        Math.round(
          ((originalPrice - price) /
            originalPrice) *
          100,
        ),
      ),
    )
    : 0;

  /* ==========================================================
     CART
  ========================================================== */

  const lineId = cartLineId(id, product.defaultVariantId);
  const availability = useProductAvailability(product);
  const quantity = useCartStore(
    (state) =>
      state.items.find(
        (item) =>
          item.id === lineId,
      )?.quantity ?? 0,
  );

  const incrementItem =
    useCartStore(
      (state) =>
        state.incrementItem,
    );

  const decrementItem =
    useCartStore(
      (state) =>
        state.decrementItem,
    );

  /* ==========================================================
     ADD TO CART
  ========================================================== */

  function handleAdd() {
    addToCart({
      isAvailable: availability.isAvailable,
      id: lineId,
      productId: id,
      variantId: product.defaultVariantId,
      name,
      weight,
      price,
      originalPrice,

      storeId:
        storeId ?? '',

      storeName,
      imageUrl,
    });
  }

  return (
    <>
      <Pressable
        onPress={() =>
          setIsDetailOpen(true)
        }
        style={{
          width: CARD_WIDTH,
        }}
        className="
          active:opacity-95
        "
      >
        {/* ====================================================
            MAIN DEAL CARD

            Native React Native View owns:
            - background
            - radius
            - clipping

            This is the structure that fixed the rounded corners.
        ===================================================== */}

        <View
          className="
            w-full
            overflow-hidden
            rounded-2xl
            bg-[#332A26]
          "
        >
          {/* ===============================================
              OFFER HEADER
          ================================================ */}

          <View
            className="
              items-center
              px-3
              pt-4
            "
          >
            {hasDeal ? (
              <>
                {/* SAVINGS */}

                <Text
                  className="
                    mt-1
                    text-[25px]
                    font-extrabold
                    tracking-[-0.7px]
                    text-white
                  "
                >
                  ₹{saveAmount} SAVED
                </Text>
              </>
            ) : (
              <>
                <Text
                  className="
                    text-[11px]
                    font-semibold
                    tracking-[0.7px]
                    text-white/60
                  "
                >
                  SPECIAL PICK
                </Text>

                <Text
                  className="
                    mt-1
                    text-[21px]
                    font-bold
                    text-white
                  "
                >
                  FOR YOU
                </Text>
              </>
            )}
          </View>

          {/* ===============================================
              PRODUCT IMAGE CARD

              Height reduced to 150px.
          ================================================ */}

          <View
            style={{
              height:
                IMAGE_CARD_HEIGHT,
            }}
            className="
              mx-3
              mb-2.5
              mt-2.5
              overflow-hidden
              rounded-2xl
              bg-[#FFF8FB]
            "
          >
            <View
              className="
                h-full
                w-full
                items-center
                justify-center
              "
            >
              <Image
                source={{
                  uri:
                    imageUrl ||
                    PLACEHOLDER_IMAGE_URI,
                }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* ==================================================
            PRODUCT INFORMATION

            Outside colored section.
            No card.
            No box.
            No border container.
        =================================================== */}

        <View className="pt-2.5">
          {/* ===============================================
              PRICE + ADD
          ================================================ */}

          <View
            className="
              flex-row
              items-start
              justify-between
            "
          >
            {/* PRICE */}
            {/* =================================================
    PRICE AREA
================================================= */}

            <View
              className="
    min-w-0
    flex-1
  "
            >
              {/* MAIN PRICE + TREND ICON */}

              <View
                className="flex-row
      items-center
    "
              >
                {/* CURRENT PRICE */}

                <View
                  className="
        rounded-xl
        bg-[#FFF1CC]
        px-2.5
        py-1
      "
                >
                  <RupeePrice
                    amount={price}
                    size={19}
                    color="#242124"
                  />
                </View>

                {/* TREND DOWN ICON */}

                {hasDeal && (
                  <View
                    className="
          ml-1.5
          h-[24px]
          w-[24px]
          items-center
          justify-center
          rounded-full
          bg-[#FDEDEC]
        "
                  >
                    <AppIcon
                      icon={TradeDownIcon}
                      size={12}
                      color="#D92D20"
                      strokeWidth={2.5}
                    />
                  </View>
                )}
              </View>

              {/* MRP */}

              {hasDeal && (
                <View
                  className="
      mt-1.5
      flex-row
      items-center
    "
                >
                  <Text
                    className="
        mr-1.5
        text-[11px]
        font-semibold
        tracking-[0.15px]
        text-black/45
      "
                  >
                    MRP
                  </Text>

                  <RupeePrice
                    amount={originalPrice!}
                    size={13}
                    strike
                    color="#8E898E"
                  />
                </View>
              )}
            </View>

            {/* =================================================
    ADD / QUANTITY CONTROL
================================================== */}

            {!availability.isAvailable ? (
              <Text className="rounded-lg bg-[#FFF0EE] px-3 py-2 text-[11px] font-bold text-[#B42318]">{availability.label}</Text>
            ) : quantity === 0 ? (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  handleAdd();
                }}
                android_ripple={{
                  color: 'rgba(21,93,252,0.06)',
                  borderless: false,
                }}
                className="
      h-[34px]
      w-[60px]
      items-center
      justify-center
      overflow-hidden
      rounded-lg
     
      rounded-[8px] border border-[#155dfc] bg-white py-2 px-3
    "
              >
                <Text
                  className="
        text-[13px]
        font-extrabold
        tracking-[0.1px]
        text-[#155DFC]
      "
                >
                  ADD
                </Text>
              </Pressable>
            ) : (
              /* ===============================================
                  QUANTITY — NO BACKGROUND / NO BOX
              ================================================ */

              <View
                className="
      h-[34px]
      w-[78px]
      flex-row
      items-center
      justify-between
       rounded-[8px] border border-[#155dfc] bg-white py-2 px-3
    "
              >
                {/* MINUS */}

                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    decrementItem(lineId);
                  }}
                  hitSlop={8}
                  className="
        h-[30px]
        w-[24px]
        items-center
        justify-center
      "
                >
                  <AppIcon
                    icon={MinusSignIcon}
                    size={15}
                    color="#155DFC"
                    strokeWidth={2.5}
                  />
                </Pressable>

                {/* QUANTITY */}

                <Text
                  className="
        min-w-[20px]
        text-center
        text-[13px]
        font-extrabold
        text-[#155dfc]
      "
                >
                  {quantity}
                </Text>

                {/* PLUS */}

                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    incrementItem(lineId);
                  }}
                  hitSlop={8}
                  className="
        h-[30px]
        w-[24px]
        items-center
        justify-center
      "
                >
                  <AppIcon
                    icon={Add01Icon}
                    size={15}
                    color="#155DFC"
                    strokeWidth={2.5}
                  />
                </Pressable>
              </View>
            )}
          </View>

          {/* ===============================================
              PRODUCT NAME
          ================================================ */}

          {/* ==================================================
    PRODUCT NAME
=================================================== */}

          <Text
            numberOfLines={2}
            className="
    mt-2
    text-[14px]
    font-semibold
    leading-[18px]
    tracking-[-0.25px]
    text-[#292929]
  "
          >
            {name}
          </Text>

          {/* ==================================================
    WEIGHT
=================================================== */}

          {!!weight && (
            <Text
              numberOfLines={1}
              className="
      mt-0.5
      text-[12px]
      font-medium
      text-black/45
    "
            >
              {weight}
            </Text>
          )}
        </View>
      </Pressable>

      {/* ====================================================
          PRODUCT DETAIL SHEET
      ===================================================== */}

      <ProductDetailSheet
        product={product}
        visible={
          isDetailOpen
        }
        onClose={() =>
          setIsDetailOpen(false)
        }
      />
    </>
  );
}