import { AppImage as Image } from '../../../components/AppImage';
// One catalog card — thumbnail + name, then the two things a shop owner
// actually scans for: price and whether it's sellable right now. No
// category/unit/size-count line here anymore — that detail lives on
// ProductDetailScreen where it's actionable, not on the row where it was
// just noise next to the two numbers that matter. The whole card is the
// tap target (not just the "View" chip) — a bigger, more forgiving hit
// area than a small button, and "View" stays as a visible label so it's
// obvious the card opens something, not just decorative.
//
// Price shows "From ₹X" for a multi-size product (X = its cheapest
// variant) since a single number would otherwise misreport what it
// actually costs — see summarizeVariants in ../data.ts.

import { Pressable, Text, View } from 'react-native';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { PartnerProduct } from '../data';

interface Props {
  product: PartnerProduct;
  onPressView: (productId: string) => void;
}

export function ProductRow({ product, onPressView }: Props) {
  const hasMultipleSizes = product.variants.length > 1;
  const priceLabel = hasMultipleSizes ? `From ₹${product.price}` : `₹${product.price}`;

  return (
    <Pressable
      onPress={() => onPressView(product.id)}
      className="flex-row items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-black/5"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Image source={{ uri: product.imageUrl ?? PLACEHOLDER_IMAGE_URI }} className="h-14 w-14 rounded-2xl bg-mist" resizeMode="cover" />

      <View className="flex-1 gap-1.5">
        <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>
          {product.name}
        </Text>

        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-lg font-semibold text-ink">{priceLabel}</Text>

          <View
            className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${
              product.isInStock ? 'bg-lime-soft' : 'bg-danger/10'
            }`}
          >
            <View className={`h-1.5 w-1.5 rounded-full ${product.isInStock ? 'bg-lime-deep' : 'bg-danger'}`} />
            <Text className={`text-[12px] font-medium ${product.isInStock ? 'text-lime-deep' : 'text-danger'}`}>
              {product.isInStock ? 'In Stock' : 'Out of Stock'}
              {product.stockQuantity != null && product.stockQuantity > 0 ? ` · ${product.stockQuantity}` : ''}
            </Text>
          </View>

          {/* Only ever set by POST /partner/products (this store owner's
              own add) — invisible to customers until a founder approves it
              in admin, see useCatalogStore.ts's own note. */}
          {product.approvalStatus === 'pending' && (
            <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-2 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <Text className="text-[12px] font-medium text-amber-700">Pending approval</Text>
            </View>
          )}
          {product.approvalStatus === 'rejected' && (
            <View className="flex-row items-center gap-1 rounded-full bg-danger/10 px-2 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-danger" />
              <Text className="text-[12px] font-medium text-danger">Rejected</Text>
            </View>
          )}
        </View>
      </View>

      <View className="flex-row items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-100 px-3.5 py-2">
        <Text className="text-sm font-medium text-ink">View</Text>
        <AppIcon icon={ArrowDown01Icon} size={11} color={colors.ink} />
      </View>
    </Pressable>
  );
}
