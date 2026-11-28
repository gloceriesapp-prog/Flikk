import { Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS, TAG_LEAD_BG, TAG_VALUE_BG, TAG_VALUE_TEXT } from '../layout';
import { CardTag } from './CardTag';

const rupees = (value: number) => `₹${Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2)}`;

// Tall deal card: tag pill, title, two-tone price pill (real MRP struck |
// price, same colours as the tag), big photo, the line as the product name.
// The MRP shows only when the server sent a real one above the price.
export function TodayHero({ hero, width, height, onPress }: { hero: GridCard; width: number; height: number; onPress: () => void }) {
  const price = hero.price;
  const mrp = price && price.mrp != null && price.mrp > price.amount ? price.mrp : null;
  const photo = photosFor(hero.id, hero.imageUrls, 1)[0];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="today-hero"
      accessibilityLabel={`${hero.title}, ${hero.tag}${price ? `, from ${rupees(price.amount)}` : ''}. ${hero.line}`}
      className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={hero.tag} />
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} className="mt-2 px-1.5 text-center text-[16px] font-semibold leading-[19px] tracking-[-0.3px] text-ink">{hero.title}</Text>
      {price ? (
        <View className="mt-2 flex-row items-center overflow-hidden rounded-full">
          {mrp != null ? <Text className="px-2 py-1 text-[12px] font-semibold text-white/80 line-through" style={{ backgroundColor: TAG_LEAD_BG }}>{rupees(mrp)}</Text> : null}
          <Text className="px-2.5 py-0.5 text-[16px] font-bold" style={{ backgroundColor: TAG_VALUE_BG, color: TAG_VALUE_TEXT }}>{rupees(price.amount)}</Text>
        </View>
      ) : null}
      <View className="w-full flex-1 px-2 py-2">
        <AppImage source={{ uri: photo }} resizeMode="contain" accessible={false} testID="today-photo" style={{ width: '100%', height: '100%' }} />
      </View>
      <Text numberOfLines={2} className="mb-2.5 px-1.5 text-center text-[13px] font-semibold leading-[16px] text-ink">{hero.line}</Text>
    </Pressable>
  );
}
