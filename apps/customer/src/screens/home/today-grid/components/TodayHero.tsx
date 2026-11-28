import { Pressable, Text, View } from 'react-native';
import type { GridCard } from '../api';
import { BORDER, HERO_RADIUS, LINE_COLOR, TITLE_COLOR } from '../layout';
import { CardImages } from './CardImages';
import { CardTag } from './CardTag';

const rupees = (value: number) => `₹${Number.isInteger(value) ? value : value.toFixed(2)}`;

// "Today's Fresh" hero. The MRP is struck only when the server sent a real
// one above the price (honest-number rule enforced server-side too).
export function TodayHero({ hero, width, height, onPress }: { hero: GridCard; width: number; height: number; onPress: () => void }) {
  const price = hero.price;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="today-hero"
      accessibilityLabel={`${hero.title}, ${hero.tag}${price ? `, from ${rupees(price.amount)}` : ''}. ${hero.line}`}
      className="overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: HERO_RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={hero.tag} bg={hero.tagBg} color={hero.tagText} />
      <View className="flex-1 px-2.5 pb-2.5" style={{ paddingTop: 8 }}>
        {/* Narrow phones (360 px) give the hero ~100 px: shrink so words never clip. */}
        <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} className="font-black tracking-[-0.3px]"
          style={{ color: TITLE_COLOR, fontSize: width < 112 ? 16 : 19, lineHeight: width < 112 ? 19 : 22 }}>{hero.title}</Text>
        <Text numberOfLines={2} className="mt-1 text-[12px] leading-[15px]" style={{ color: LINE_COLOR }}>{hero.line}</Text>
        {price ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <View className="rounded-[8px] px-2 py-0.5" style={{ backgroundColor: hero.accent }}>
              <Text className="text-[14px] font-black" style={{ color: hero.tagText }}>{rupees(price.amount)}</Text>
            </View>
            {price.mrp != null && price.mrp > price.amount
              ? <Text className="text-[12px] font-semibold line-through" style={{ color: LINE_COLOR }}>{rupees(price.mrp)}</Text> : null}
          </View>
        ) : null}
        <View className="flex-1" />
        <CardImages urls={hero.imageUrls} accent={hero.accent} height={Math.round(height * 0.42)} radius={16} />
      </View>
    </Pressable>
  );
}
