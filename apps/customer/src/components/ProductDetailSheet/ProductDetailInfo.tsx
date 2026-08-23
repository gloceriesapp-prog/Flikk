// Plain content block, not its own scroller — ProductDetailSheet.tsx owns one
// Animated.ScrollView for the whole card (hero image + this block scroll
// together, and that scroll offset is what drives the card's grow-to-full-
// screen animation), this just renders what sits inside it below the image.
// Every row here only renders when the product actually has the field set
// (Product's own note in types.ts).
//
// Main card (#FAFAFA bg): title (font-medium, not bold — deliberately
// quieter than the reference's earlier bold treatment), pack-size chips
// (sizeOptions — UI selection only, see Product's own note on why it
// doesn't change the price below it), price + original price if set, then a
// hairline divider + the seller row. replacementPolicy still exists on
// Product but no longer renders anywhere in this sheet. ETA/breadcrumb/
// description rows were removed per an earlier explicit ask.
//
// SellerDetailsCard (FSSAI/address) and SimilarProductsRow are their own
// sections below the main card, not inside it and not sharing its
// background — an explicit ask to keep seller/regulatory info visually
// distinct rather than folded into the product card.

import { useState } from 'react';
import { ChevronRightIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { SellerDetailsCard } from './SellerDetailsCard';
import { SimilarProductsRow } from './SimilarProductsRow';
import type { Product } from '../../screens/home/products/types';

interface Props {
  product: Product;
}

export function ProductDetailInfo({ product }: Props) {
  const { name, localName, weight, price, originalPrice, storeName, sizeOptions, sellerDetails, relatedProducts } = product;
  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize, setSelectedSize] = useState(chips.includes(weight) ? weight : chips[0]);

  return (
    <View style={{ backgroundColor: '#FAFAFA' }} className="gap-2.5 px-3 pb-4 pt-3">
      <View className="gap-3 rounded-2xl bg-white px-4 py-4">
        <Text className="text-xl font-medium leading-7 text-ink">
          {name} ({localName})
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {chips.map((size) => {
            const isSelected = size === selectedSize;
            return (
              <Pressable
                key={size}
                onPress={() => setSelectedSize(size)}
                className={`rounded-xl border px-4 py-2 ${isSelected ? 'border-lime-deep bg-lime-soft' : 'border-mist bg-white'}`}
              >
                <Text className={`text-xs font-medium ${isSelected ? 'text-lime-deep' : 'text-ink/70'}`}>{size}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-baseline gap-2">
          <Text className="text-xl font-medium text-ink">₹{price}</Text>
          {originalPrice && <Text className="text-sm text-ink/40 line-through">₹{originalPrice}</Text>}
        </View>

        {storeName && (
          <>
            <View className="h-px bg-mist" />
            <Pressable className="flex-row items-center gap-3">
              <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-10 w-10 rounded-xl" resizeMode="cover" />
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-ink">{storeName}</Text>
                <Text className="text-xs text-ink/50">Explore all products</Text>
              </View>
              <AppIcon icon={ChevronRightIcon} size={16} color={colors.ink} />
            </Pressable>
          </>
        )}
      </View>

      {sellerDetails && <SellerDetailsCard sellerDetails={sellerDetails} />}

      {relatedProducts && relatedProducts.length > 0 && <SimilarProductsRow products={relatedProducts} />}
    </View>
  );
}
