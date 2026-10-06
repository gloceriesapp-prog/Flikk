import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { Product } from '../../products/types';

interface Props {
  products: Product[];
  sectionTitle: string;
  onPress: () => void;
  label?: string;
  avatarCount?: number;
}

export function SeeAllProductsButton({ products, sectionTitle, onPress, label = 'Explore more', avatarCount = 3 }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Explore more ${sectionTitle.toLowerCase()} products`}
      onPress={onPress}
      className="mt-5 min-h-[52px] w-full flex-row items-center justify-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2 active:bg-[#E9EBEF]"
    >
      <View className="flex-row items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {products.slice(0, avatarCount).map((product, index) => (
          <View key={product.id} className="h-8 w-8 overflow-hidden rounded-full border border-[#DDE1EA] bg-white" style={{ marginLeft: index === 0 ? 0 : -10, zIndex: index + 1 }}>
            <Image source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="contain" />
          </View>
        ))}
      </View>
      <View className="flex-shrink flex-row items-center gap-2">
        <Text className="flex-shrink text-[15px] font-semibold text-[#4352A1]">{label}</Text>
        <View style={{ width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 6, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#4352A1' }} />
      </View>
    </Pressable>
  );
}
