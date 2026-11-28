import { Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS } from '../layout';
import { CardTag } from './CardTag';

const rupees = (value: number) => `₹${Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2)}`;

// Tall deal card: title, joined price pill (real MRP struck | price), big
// photo, the line as the product name, offer strip across the foot. The MRP
// shows only when the server sent a real one above the price.
export function TodayHero({ hero, width, height, onPress }: { hero: GridCard; width: number; height: number; onPress: () => void }) {
  const price = hero.price;
  const mrp = price && price.mrp != null && price.mrp > price.amount ? price.mrp : null;
  const photo = photosFor(hero.id, hero.imageUrls, 1)[0];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="today-hero"
      accessibilityLabel={`${hero.title}, ${hero.tag}${price ? `, from ${rupees(price.amount)}` : ''}. ${hero.line}`}
      className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} className="mt-3 px-1.5 text-center text-[16px] font-bold leading-[19px] tracking-[-0.3px] text-ink">{hero.title}</Text>
      {price ? (
        <View className="mt-2.5 flex-row items-center overflow-hidden rounded-full border" style={{ borderColor: hero.accent }}>
          {mrp != null ? <Text className="bg-white px-2 py-1 text-[12px] font-semibold text-[#6B7280] line-through">{rupees(mrp)}</Text> : null}
          <Text className="px-2.5 py-1 text-[16px] font-black" style={{ backgroundColor: hero.accent, color: hero.tagText }}>{rupees(price.amount)}</Text>
        </View>
      ) : null}
      <View className="w-full flex-1 px-2 py-2">
        <AppImage source={{ uri: photo }} resizeMode="contain" accessible={false} testID="today-photo" style={{ width: '100%', height: '100%' }} />
      </View>
      <Text numberOfLines={2} className="mb-2 px-1.5 text-center text-[13px] font-bold leading-[16px] text-ink">{hero.line}</Text>
      <CardTag label={hero.tag} bg={hero.tagBg} color={hero.tagText} />
    </Pressable>
  );
}
