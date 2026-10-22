import { Text, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import type { OrderItemSummary } from '../../../screens/purchase/data';
import { RatingStars } from './RatingStars';

export function OrderItemRatingRow({ item, rating, onRate }: { item: OrderItemSummary; rating: number; onRate: (value: number) => void }) {
  return (
    <View className="w-full flex-row items-center gap-4 border-b border-[#ECECEE] py-4">
      <AppImage source={{ uri: item.imageUri }} style={{ width: 64, height: 72, borderRadius: 12, backgroundColor: '#FAFAFA' }} resizeMode="contain" accessible={false} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} className="text-[14px] font-semibold leading-5 text-[#171717]">{item.name}</Text>
        <View className="-ml-1.5 mt-1"><RatingStars label={item.name} value={rating} onChange={onRate} /></View>
      </View>
    </View>
  );
}
