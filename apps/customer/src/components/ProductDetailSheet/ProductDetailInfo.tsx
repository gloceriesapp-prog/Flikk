// Plain content block, not its own scroller — ProductDetailSheet.tsx owns one
// Animated.ScrollView for the whole card (hero image + this block scroll
// together, and that scroll offset is what drives the card's grow-to-full-
// screen animation), this just renders what sits inside it below the image.
// Every row here only renders when the product actually has the field set
// (Product's own note in types.ts).
//
// Main card (#FAFAFA bg): title (font-medium, not bold — deliberately
// quieter than the reference's earlier bold treatment), description (only
// when the product has one), pack-size chips (sizeOptions — UI selection
// only, see Product's own note on why it doesn't change the price below
// it), price — with a centered vertical divider + "MRP ₹X" (strikethrough
// only on the number, not the "MRP" label) when there's an originalPrice —
// then a hairline divider + the seller row. replacementPolicy still exists
// on Product but no longer renders anywhere in this sheet. The breadcrumb
// row was removed per an earlier explicit ask; description came back per a
// later one.
//
// SellerDetailsCard (FSSAI/address) and SimilarProductsRow are their own
// sections below the main card, not inside it and not sharing its
// background — an explicit ask to keep seller/regulatory info visually
// distinct rather than folded into the product card.

import { useState } from 'react';
import { ChevronRightIcon, HeartIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { SellerDetailsCard } from './SellerDetailsCard';
import { SimilarProductsRow } from './SimilarProductsRow';
import type { Product } from '../../screens/home/products/types';

interface Props {
  product: Product;
  // ProductDetailSheet's own resolved list — product.relatedProducts when
  // a mock product set one inline, otherwise whatever useSimilarProducts
  // fetched for a real one. Falling back to product.relatedProducts here
  // too so any other caller that renders this directly (none currently do)
  // still works without passing the prop.
  relatedProducts?: Product[];
}

export function ProductDetailInfo({ product, relatedProducts }: Props) {
  const { name, localName, weight, price, originalPrice, description, storeName, sizeOptions, sellerDetails } = product;
  const related = relatedProducts ?? product.relatedProducts;
  const chips = sizeOptions && sizeOptions.length > 0 ? sizeOptions : [weight];
  const [selectedSize, setSelectedSize] = useState(chips.includes(weight) ? weight : chips[0]);
  // Local-only wishlist toggle on the title row itself — separate from the
  // header's own bookmark button (ProductDetailSheet.tsx), nothing persists
  // either yet.
  const [isLiked, setIsLiked] = useState(false);

  return (
    <View style={{ backgroundColor: '#FAFAFA' }} className="gap-2.5 px-3 pb-4 pt-3">
      <View className="gap-3 rounded-2xl bg-white px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-xl font-medium leading-7 text-ink">
            {name}
            {localName ? ` (${localName})` : ''}
          </Text>
          <Pressable onPress={() => setIsLiked((prev) => !prev)} hitSlop={8} className="pt-0.5">
            <AppIcon
              icon={HeartIcon}
              size={22}
              color={isLiked ? colors.danger : colors.ink}
              fill={isLiked ? colors.danger : 'none'}
            />
          </Pressable>
        </View>

        {description && <Text className="text-sm leading-5 text-ink/60">{description}</Text>}

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

        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-medium text-ink">₹{price}</Text>
          {originalPrice && originalPrice > price && (
            <>
              <Text className="text-sm text-ink/40 line-through">₹{originalPrice}</Text>
              <View className="rounded-full bg-lime-soft px-2 py-0.5">
                <Text className="text-xs font-semibold text-lime-deep">
                  {Math.round((1 - price / originalPrice) * 100)}%
                </Text>
              </View>
            </>
          )}
        </View>

        {storeName && (
          <>
            <View className="h-px bg-mist" />
            <Pressable className="flex-row items-center gap-3">
              <Image source={{ uri: product.storePhotoUrl || PLACEHOLDER_IMAGE_URI }} className="h-10 w-10 rounded-xl" resizeMode="cover" />
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

      {related && related.length > 0 && <SimilarProductsRow products={related} />}
    </View>
  );
}
