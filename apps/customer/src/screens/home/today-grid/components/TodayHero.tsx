import { Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard } from '../api';
import { BORDER, RADIUS } from '../layout';
import { PhotoPlaceholder } from './CardImages';
import { CardTag } from './CardTag';

const rupees = (value: number) => `₹${Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2)}`;

// Tall deal card: pill, title, the real MRP struck on a soft chip, the price
// big on an accent chip, the line, and the photo filling the foot. The MRP
// shows only when the server sent a real one above the price.
export function TodayHero({ hero, width, height, pillHeight, onPress }: { hero: GridCard; width: number; height: number; pillHeight: number; onPress: () => void }) {
  const price = hero.price;
  const photo = hero.imageUrls[0];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="today-hero"
      accessibilityLabel={`${hero.title}, ${hero.tag}${price ? `, from ${rupees(price.amount)}` : ''}. ${hero.line}`}
      className="items-center overflow-hidden bg-white px-1.5 active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={hero.tag} bg={hero.tagBg} color={hero.tagText} height={pillHeight} />
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} className="mt-2 text-center text-[15px] font-black leading-[18px] tracking-[-0.3px] text-ink">{hero.title}</Text>
      {price ? (
        <>
          {price.mrp != null && price.mrp > price.amount ? (
            <View className="mt-2 rounded-md bg-[#F1F3F6] px-1.5 py-0.5">
              <Text className="text-[12px] font-semibold text-[#6B7280] line-through">{rupees(price.mrp)}</Text>
            </View>
          ) : null}
          <View className="mt-1 rounded-[10px] px-2.5 py-1" style={{ backgroundColor: hero.accent }}>
            <Text className="text-[20px] font-black tracking-[-0.4px]" style={{ color: hero.tagText }}>{rupees(price.amount)}</Text>
          </View>
        </>
      ) : null}
      <Text numberOfLines={width < 110 ? 1 : 2} className="mt-1.5 text-center text-[12px] font-bold leading-[15px] text-ink">{hero.line}</Text>
      {photo ? (
        <View className="w-full flex-1 justify-end pb-2">
          <AppImage source={{ uri: photo }} resizeMode="contain" accessible={false} style={{ width: '100%', height: '100%', flex: 1 }} />
        </View>
      ) : <View className="w-full flex-1 justify-end"><PhotoPlaceholder width={width} height={Math.round(width * 0.8)} accent={hero.accent} /></View>}
    </Pressable>
  );
}
