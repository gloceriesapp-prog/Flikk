import { Text, View } from 'react-native';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import type { Product } from '../../products/types';

export function DiscoveryProductCard({ product, previewOnly = false }: { product: Product & { explanation: string }; previewOnly?: boolean }) {
  return (
    <View className="w-[164px] rounded-[22px] border border-[#E9E3F0] bg-white p-3">
      <GroceryProductTile product={product} previewOnly={previewOnly} />
      <View className="mt-3 rounded-xl bg-[#F5F0FA] px-2.5 py-3">
        <Text className="mb-1 text-[11px] font-semibold text-[#716085]">What is it?</Text>
        <Text numberOfLines={3} className="text-[12px] leading-[17px] text-[#61546D]">{product.explanation}</Text>
      </View>
    </View>
  );
}
