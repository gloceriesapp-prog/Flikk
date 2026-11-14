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

import { ChevronRightIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { RupeePrice } from '../RupeePrice';
import { GILROY } from '../../theme/fonts';
import { AppImage as Image } from '../AppImage';
import { AppIcon } from '../AppIcon';
import { colors } from '../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { ProductVariantOptions, discountPercentOf } from './ProductVariantOptions';
import { ProductCutOptions } from './ProductCutOptions';
import { ProductFlavourOptions } from './ProductFlavourOptions';
import { flavourPrice } from '../FlavourPicker/flavourPricing';
import { flavourChoices } from './flavourSelection';
import { ProductServingOptions } from './ProductServingOptions';
import { ProductPreorderOptions } from './ProductPreorderOptions';
import type { CartPreorder } from '../../store/preorder';
import type { CutSize, Serving } from '../../store/cartIdentity';
import { SellerDetailsCard } from './SellerDetailsCard';
import { SimilarProductsRow } from './SimilarProductsRow';
import { ReplacementCard } from './ReplacementCard';
import type { Product } from '../../screens/home/products/types';

interface Props {
  product: Product;
  // Real variant selection, lifted to ProductDetailSheet.tsx's own Card so
  // ProductDetailFooter (a sibling, not a child of this component) can
  // read the same pick — see that file's own note. Both undefined when the
  // product has 0-1 real variants; this component falls back to the plain
  // single weight/price display in that case, same as before this prop
  // existed.
  selectedVariantId?: string;
  onSelectVariant?: (id: string) => void;
  // Opens a tapped similar product (in the same detail page).
  onSelectProduct?: (product: Product) => void;
  // Chicken cut size, lifted to the sheet like the variant (the footer adds it).
  selectedCut?: CutSize;
  onSelectCut?: (cut: CutSize) => void;
  // Flavour, lifted to the sheet like the variant (the footer adds it).
  selectedOptionId?: string;
  onSelectOption?: (id: string) => void;
  // Chilled / room temperature, lifted to the sheet (the footer adds it).
  selectedServing?: Serving;
  onSelectServing?: (serving: Serving) => void;
  // Pre-order day + slot, lifted to the sheet (the footer adds it).
  preorder?: CartPreorder;
  onSelectPreorder?: (preorder: CartPreorder | undefined) => void;
}

export function ProductDetailInfo({ product, selectedVariantId, onSelectVariant, selectedCut, onSelectCut, selectedOptionId, onSelectOption, selectedServing, onSelectServing, preorder, onSelectPreorder, onSelectProduct }: Props) {
  const { name, localName, weight, storeName, sellerDetails } = product;
  const option = product.options?.find(o => o.id === selectedOptionId);
  const { price, originalPrice, unitPriceLabel } = flavourPrice(product, option);
  const variants = product.variants?.map(v => ({ ...v, ...flavourPrice(product, option, v) }));
  const hasRealVariants = variants && variants.length > 1;
  const selectedVariant = hasRealVariants ? variants!.find((v) => v.id === selectedVariantId) : undefined;
  const displayPrice = selectedVariant?.price ?? price;
  const displayOriginalPrice = selectedVariant?.originalPrice ?? originalPrice;
  const displayPercent = discountPercentOf(displayPrice, displayOriginalPrice);

  // With no option pickers between them, the size line hugs the title with
  // the same 4px gap it has above the price (card gap-3 minus -mt-2).
  const hasOptions = hasRealVariants || !!(product.cutOptions && selectedCut && onSelectCut)
    || !!(product.options?.length && onSelectOption) || !!(product.preorder && onSelectPreorder)
    || !!(product.servingOptions?.length && onSelectServing);

  return (
    <View className="gap-3 bg-[#f6f6f6] px-3 pb-4 pt-3">
      <View className="gap-3 rounded-2xl bg-[#FFFFFF] px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-[18px] leading-[24px] text-ink" style={{ fontFamily: GILROY.bold }}>
            {name}
            {localName ? ` (${localName})` : ''}
          </Text>
        </View>

        {/* "Select Unit" cards only when there is more than one size. */}
        {hasRealVariants ? (
          <ProductVariantOptions
            variants={variants!}
            selectedId={selectedVariantId ?? variants![0]!.id}
            onSelect={(id) => onSelectVariant?.(id)}
          />
        ) : null}

        {product.cutOptions && selectedCut && onSelectCut ? (
          <ProductCutOptions selected={selectedCut} onSelect={onSelectCut} bulkMinKg={product.bulkMinKg} />
        ) : null}

        {product.options?.length && onSelectOption ? (
          <ProductFlavourOptions options={flavourChoices(product)} availableQuantity={selectedVariant?.availableQuantity ?? product.availableQuantity} selectedId={selectedOptionId} onSelect={onSelectOption} />
        ) : null}

        {product.preorder && onSelectPreorder ? (
          <ProductPreorderOptions minQty={product.preorder.minQty} leadDays={product.preorder.leadDays} value={preorder} onChange={onSelectPreorder} />
        ) : null}

        {product.servingOptions?.length && onSelectServing ? (
          <ProductServingOptions options={product.servingOptions} selected={selectedServing} onSelect={onSelectServing} />
        ) : null}

        {/* Single-price product: size, price + MRP, "% OFF on MRP", unit price.
            With several sizes the Select Unit cards above already show all of it. */}
        {hasRealVariants ? null : <View className={hasOptions ? '' : '-mt-2'}>
          <Text className="text-[14px] font-bold text-ink">{selectedVariant?.label ?? weight}</Text>
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <RupeePrice amount={displayPrice} size={22} />
            {displayPercent ? (
              <View className="flex-row items-center gap-1">
                <Text className="text-[13px] text-ink/50">MRP</Text>
                <RupeePrice amount={displayOriginalPrice!} size={13} strike color="#6B6B6B" />
              </View>
            ) : null}
          </View>
          {displayPercent ? (
            <Text className="mt-1 text-[13px] font-bold text-[#16A34A]">{displayPercent}% OFF on MRP</Text>
          ) : null}
          {(selectedVariant?.unitPriceLabel ?? unitPriceLabel) ? (
            <Text className="mt-1 text-[13px] text-ink/70">{selectedVariant?.unitPriceLabel ?? unitPriceLabel}</Text>
          ) : null}
        </View>}

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

      <ReplacementCard />

      {sellerDetails && (
        <View className="overflow-hidden rounded-2xl bg-white">
          <SellerDetailsCard sellerDetails={sellerDetails} />
        </View>
      )}

      <View className="overflow-hidden rounded-2xl bg-white">
        <SimilarProductsRow product={product} onSelect={onSelectProduct} />
      </View>
    </View>
  );
}
