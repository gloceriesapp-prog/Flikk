import {
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ProductCard } from '../products/ProductCard';

import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import type { Product } from '../products/types';
import { useCopy } from '../../../api/appConfig';

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
  collectionProducts: Product[];
  title: string;
  subtitle?: string | null;
}

export function DealsForYouSection({
  products,
  collectionProducts,
  title,
  subtitle,
}: Props) {
  const ctaLabel = useCopy('home.dealsForYou.cta');
  const offers = products.slice(0, MAX_OFFERS);

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

        <HomeProductCollectionButton
          label={ctaLabel}
          title={title}
          products={collectionProducts}
          preview={offers}
          showDiscountBadge
        />

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