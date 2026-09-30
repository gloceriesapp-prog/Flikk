import { useState } from 'react';

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ProductCard } from '../products/ProductCard';

import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';

import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';

import type { AppStackParamList } from '../../../navigation/types';
import type { Product } from '../products/types';

/* ============================================================
   CONFIG
============================================================ */

const CARD_WIDTH = 'w-32';
const MAX_OFFERS = 4;

const SECTION_BG = '#EEF3FF';
const TITLE_COLOR = '#190B3D';
const SUBTITLE_COLOR = '#453765';

interface Props {
  products: Product[];
  title?: string;
  subtitle?: string | null;
}

export function DealsForYouSection({
  products,
  title = 'Everyday Savings',
  subtitle = 'Save more on products worth buying',
}: Props) {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList>
    >();

  const [
    shuffleOffset,
    setShuffleOffset,
  ] = useState(0);

  const visibleCount = Math.min(
    MAX_OFFERS,
    products.length,
  );

  const offers =
    products.length === 0
      ? []
      : Array.from(
        {
          length: visibleCount,
        },
        (_, index) =>
          products[
          (shuffleOffset +
            index) %
          products.length
          ],
      );

  function handleShuffle() {
    if (
      products.length <=
      MAX_OFFERS
    ) {
      return;
    }

    setShuffleOffset(
      (current) =>
        (current +
          MAX_OFFERS) %
        products.length,
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <View className="bg-white pt-7">
      {/* ======================================================
          FULL-WIDTH DEAL SECTION
      ======================================================= */}

      <View
        style={{
          backgroundColor:
            SECTION_BG,
        }}
        className="
          relative
          w-full
          overflow-hidden
          pb-9
        "
      >
        {/* ====================================================
            TOP SCALLOP EFFECT
        ===================================================== */}

        <View
          pointerEvents="none"
          className="
            absolute
            -top-[9px]
            left-0
            right-0
            z-20
            flex-row
            justify-between
          "
        >
          {Array.from({
            length: 20,
          }).map(
            (_, index) => (
              <View
                key={`top-${index}`}
                className="
                  h-[18px]
                  w-[18px]
                  rounded-full
                  bg-white
                "
              />
            ),
          )}
        </View>

        {/* ====================================================
            HEADER
        ===================================================== */}

        <View
          className="
            flex-row
            items-start
            justify-between
            px-5
            pb-5
            pt-8
          "
        >
          {/* TITLE */}

          <View
            className="
              min-w-0
              flex-1
              pr-3
            "
          >
            <Text
              style={{
                color:
                  TITLE_COLOR,
              }}
              className="
                text-[25px]
                font-extrabold
                leading-[29px]
                tracking-[-0.8px]
              "
            >
              {title}
            </Text>

            <Text
              style={{
                color:
                  SUBTITLE_COLOR,
              }}
              className="
                mt-1
                text-[13px]
                font-semibold
                tracking-[-0.1px]
              "
            >
              {subtitle}
            </Text>
          </View>
        </View>

        {/* ====================================================
            PRODUCTS
        ===================================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            gap: 12,
          }}
        >
          {offers.map(
            (product) => (
              <ProductCard
                key={product.id}
                product={
                  product
                }
                showDiscountBadge
                widthClassName={
                  CARD_WIDTH
                }
              />
            ),
          )}
        </ScrollView>

        {/* ====================================================
            SEE ALL DEALS
        ===================================================== */}

        {/* ====================================================
    SEE ALL DEALS
===================================================== */}

        <View
          className="
    px-5
    pb-3
    pt-5
  "
        >
          <Pressable
            onPress={() =>
              navigation.navigate(
                'Store',
              )
            }
            className="
      h-[50px]
      flex-row
      items-center
      justify-center
      rounded-2xl
      border
      border-[#D9E2F5]
      bg-white
      px-4
      active:opacity-85
    "
          >
            {/* PRODUCT PREVIEW */}

            <View
              className="
        mr-2.5
        flex-row
        items-center
      "
            >
              {offers
                .slice(0, 3)
                .map(
                  (
                    product,
                    index,
                  ) => (
                    <View
                      key={
                        product.id
                      }
                      className={`
                h-[30px]
                w-[30px]
                items-center
                justify-center
                overflow-hidden
                rounded-full
                border
                border-white
                bg-[#F8FAFD]
                ${index === 0
                          ? ''
                          : '-ml-2'
                        }
              `}
                    >
                      <Image
                        source={{
                          uri:
                            product.imageUrl ||
                            PLACEHOLDER_IMAGE_URI,
                        }}
                        style={{
                          width:
                            '100%',
                          height:
                            '100%',
                        }}
                        resizeMode="contain"
                      />
                    </View>
                  ),
                )}
            </View>

            {/* CTA TEXT */}

            <Text
              className="
        text-[14px]
        font-bold
        tracking-[-0.15px]
        text-[#2F3F83]
      "
            >
              See all deals
            </Text>

            {/* ARROW */}

            <View className="ml-1">
              <AppIcon
                icon={
                  ArrowRight02Icon
                }
                size={15}
                color="#2F3F83"
                strokeWidth={2.4}
              />
            </View>
          </Pressable>
        </View>

        {/* ====================================================
            BOTTOM SCALLOP EFFECT
        ===================================================== */}

        <View
          pointerEvents="none"
          className="
            absolute
            -bottom-[9px]
            left-0
            right-0
            z-20
            flex-row
            justify-between
          "
        >
          {Array.from({
            length: 20,
          }).map(
            (_, index) => (
              <View
                key={`bottom-${index}`}
                className="
                  h-[18px]
                  w-[18px]
                  rounded-full
                  bg-white
                "
              />
            ),
          )}
        </View>
      </View>
    </View>
  );
}