import { Text, useWindowDimensions, View } from 'react-native';
import { AppImage } from '../../../components/AppImage';
import { RatingStars } from './RatingStars';

export function DeliveryRatingSection({ riderName, rating, onRate }: { riderName: string; rating: number; onRate: (value: number) => void }) {
  const { width } = useWindowDimensions();
  const illustrationWidth = Math.min(128, Math.max(100, 100 + (width - 320) * 0.4));
  return (
    <View className="w-full flex-row items-center gap-3 border-b border-[#ECECEE] pb-6 pt-5">
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] font-semibold leading-[23px] text-[#111111]">How was your delivery?</Text>
        <Text className="mt-1.5 text-[13px] font-medium leading-[19px] text-[#737373]">{riderName.trim() ? `Delivered by ${riderName.trim()}` : 'Rate your delivery partner'}</Text>
        <View className="-ml-1.5 mt-3"><RatingStars label="delivery" value={rating} onChange={onRate} size={24} /></View>
        <Text className="mt-1 text-[12px] font-medium leading-[18px] text-[#737373]">{rating ? `${rating} out of 5` : 'Tap a star'}</Text>
      </View>
      <AppImage source={require('../../../../assets/illustrations/delivery-rating-rider-blue.png')}
        style={{ width: illustrationWidth, height: illustrationWidth * 1.32 }} resizeMode="contain" accessible={false} />
    </View>
  );
}
