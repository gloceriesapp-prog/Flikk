import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon, Store03Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { ProductCardView } from '../../products/ProductCardView';
import type { Product } from '../../products/types';

interface Props {
  name: string;
  products: Product[];
  isOpen?: boolean;
  distanceLabel?: string;
  previewOnly?: boolean;
  onOpen?: () => void;
  buttonLabel?: string;
  showButton?: boolean;
}

export function RegionalShopCard({ name, products, isOpen, distanceLabel, previewOnly = false, onOpen, buttonLabel = 'View store', showButton = true }: Props) {
  return (
    <View className="w-[308px] overflow-hidden rounded-[28px] border border-gray-200 bg-white p-4">
      <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#155DFC]/[0.08] px-2.5 py-1.5">
        <AppIcon icon={Store03Icon} size={13} color="#155DFC" strokeWidth={2} />
        <Text className="text-[12px] font-semibold text-[#155DFC]">Nearby</Text>
      </View>
      <Text numberOfLines={1} className="mt-3 text-[17px] font-semibold tracking-[-0.35px] text-ink">{name}</Text>
      {!previewOnly && (
        <View className="mt-1.5 flex-row items-center gap-2">
          <Text className={`text-[11px] font-semibold ${isOpen ? 'text-[#407039]' : 'text-ink/50'}`}>{isOpen ? 'Open now' : 'Closed now'}</Text>
          {distanceLabel && <Text className="text-[11px] text-ink/50">{distanceLabel} away</Text>}
        </View>
      )}
      <View className="mt-4 flex-row items-start gap-2">
        {products.slice(0, 3).map((product) => (
          <View key={product.id} className="min-w-0 flex-1">
            {!previewOnly && isOpen === false ? (
              <View pointerEvents="none" accessible accessibilityLabel={`${product.name}, ${product.weight}. Store closed; open the store to browse.`}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <ProductCardView product={product} widthClassName="w-full" showDiscountBadge />
                </View>
              </View>
            ) : <GroceryProductTile product={product} previewOnly={previewOnly} />}
          </View>
        ))}
      </View>
      {showButton && <Pressable
        disabled={!onOpen}
        accessibilityRole="button"
        accessibilityLabel={onOpen ? `View ${name}` : 'View store unavailable for sample shop'}
        accessibilityState={{ disabled: !onOpen }}
        onPress={onOpen}
        className="mt-5 min-h-11 flex-row items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2.5 active:bg-[#E9EBEF]"
      >
        <Text className={`text-[14px] font-semibold ${onOpen ? 'text-[#374151]' : 'text-[#6B7280]'}`}>{buttonLabel}</Text>
        <AppIcon icon={ArrowRight01Icon} size={18} color={onOpen ? '#374151' : '#6B7280'} strokeWidth={2} />
      </Pressable>}
    </View>
  );
}
