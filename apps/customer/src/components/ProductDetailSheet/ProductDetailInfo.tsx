// Plain content block, not its own scroller — ProductDetailSheet.tsx owns one
// Animated.ScrollView for the whole card (hero image + this block scroll
// together, and that scroll offset is what drives the card's grow-to-full-
// screen animation), this just renders what sits inside it below the image.
// Every row here only renders when the product actually has the field set
// (Product's own note in types.ts).
//
// Separately-boxed white rounded cards on a gray canvas — per an explicit
// reference image (title/variants block, then each other section, as its
// own white rounded card with visible gray gutter between them, not one
// continuous white sheet with hairline dividers). SellerDetailsCard and
// SimilarProductsRow still own their own files/logic (collapse state,
// product grid); this file just wraps each in the shared white-card shell
// rather than duplicating that chrome into both of them.
//
// Title only (font-medium, not bold — deliberately quieter than an earlier
// bold treatment) — no description line anymore, per an explicit ask to
// keep every card's header to just the name, consistently. Pack-size
// chips (sizeOptions — UI selection only, see Product's own note on why
// it doesn't change the price below it), price — with a centered vertical
// divider + "MRP ₹X" (strikethrough only on the number, not the "MRP"
// label) when there's an originalPrice. replacementPolicy still exists on
// Product but no longer renders anywhere in this sheet. The breadcrumb row
// was removed per an earlier explicit ask.

import { useState } from 'react';
import { ChevronRightIcon, HeartIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../RupeePrice';
import { AppImage as Image } from '../AppImage';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { ProductVariantOptions } from './ProductVariantOptions';
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
  // Real variant selection, lifted to ProductDetailSheet.tsx's own Card so
  // ProductDetailFooter (a sibling, not a child of this component) can
  // read the same pick — see that file's own note. Both undefined when the
  // product has 0-1 real variants; this component falls back to the plain
  // single weight/price display in that case, same as before this prop
  // existed.
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
}

export function ProductDetailInfo({ product, relatedProducts, selectedVariantId, onSelectVariant }: Props) {
  const { name, localName, weight, price, originalPrice, storeName, variants, sellerDetails } = product;
  const related = relatedProducts ?? product.relatedProducts;
  const hasRealVariants = variants && variants.length > 1;
  const selectedVariant = hasRealVariants ? variants!.find((v) => v.id === selectedVariantId) : undefined;
  // Local-only wishlist toggle on the title row itself — separate from the
  // header's own bookmark button (ProductDetailSheet.tsx), nothing persists
  // either yet.
  const [isLiked, setIsLiked] = useState(false);

  const displayPrice = selectedVariant?.price ?? price;
  const displayOriginalPrice = selectedVariant?.originalPrice ?? originalPrice;

  return (
    <View className="gap-3 bg-[#f6f6f6] px-3 pb-4 pt-3">
      <View className="gap-3 rounded-2xl bg-[#FFFFFF] px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-xl font-semibold leading-7 text-ink">
            {name}
            {localName ? ` (${localName})` : ''}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle wishlist" onPress={() => setIsLiked((prev) => !prev)} hitSlop={8} className="pt-0">
            <AppIcon
              icon={HeartIcon}
              size={22}
              color={isLiked ? colors.danger : colors.ink}
              fill={isLiked ? colors.danger : 'none'}
            />
          </Pressable>
        </View>

        {/* Real per-size card grid when there's genuinely more than one
            variant to choose between; a single-size product just shows its
            one weight pill + price below, unchanged from before this
            component existed ("if there is no options" case). */}
        {hasRealVariants ? (
          <ProductVariantOptions
            variants={variants!}
            selectedId={selectedVariantId ?? variants![0]!.id}
            onSelect={(id) => onSelectVariant?.(id)}
          />
        ) : (
          <View className="flex-row flex-wrap gap-1">
            <View className="rounded-xl">
              <Text className="text-[14px] font-bold text-ink">{weight}</Text>
            </View>
          </View>
        )}

        {/* Once a real variant selector is shown, its own cards already
            carry each size's price/discount — repeating one summary price
            below would just be the previous selection's price shown twice. */}
        {!hasRealVariants && (
          <View className="flex-row items-center gap-2">
            <RupeePrice amount={displayPrice} size={20} />
            {displayOriginalPrice && displayOriginalPrice > displayPrice && (
              <>
                <RupeePrice amount={displayOriginalPrice} size={14} strike color="#101C1066" />
                <View className="rounded-full bg-lime-soft px-2 py-0.5">
                  <Text className="text-xs font-semibold text-lime-deep">
                    {Math.round((1 - displayPrice / displayOriginalPrice) * 100)}%
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {storeName && (
          <>
            <View className="h-px bg-mist" />
            <Pressable className="flex-row items-center gap-3">
              <Image source={{ uri: product.storePhotoUrl || PLACEHOLDER_IMAGE_URI }} className="h-10 w-10 rounded-xl" resizeMode="cover" />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{storeName}</Text>
                <Text className="text-[13px] text-ink/50 font-medium mt-0.5">Explore all products</Text>
              </View>
              <AppIcon icon={ChevronRightIcon} size={16} color={colors.ink} />
            </Pressable>
          </>
        )}
      </View>

      {sellerDetails && (
        <View className="overflow-hidden rounded-2xl bg-white">
          <SellerDetailsCard sellerDetails={sellerDetails} />
        </View>
      )}

      {related && related.length > 0 && (
        <View className="overflow-hidden rounded-2xl bg-white">
          <SimilarProductsRow products={related} />
        </View>
      )}
    </View>
  );
}
