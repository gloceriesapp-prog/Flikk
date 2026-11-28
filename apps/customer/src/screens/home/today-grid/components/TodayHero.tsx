import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard, ProductPeek } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS, TAG_LEAD_BG, TAG_VALUE_BG, TAG_VALUE_TEXT } from '../layout';
import { CardTag } from './CardTag';

export const ROTATE_MS = 3000;
const rupees = (value: number) => `₹${Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2)}`;

// Tall deal card: tag tab, title, then one product at a time (up to 4,
// rotating every 3 s): MRP struck on a dark chip (only when real), store
// price on the lime chip, product name, photo at the foot.
export function TodayHero({ hero, width, height, onPress }: { hero: GridCard; width: number; height: number; onPress: () => void }) {
  const products = hero.products ?? [];
  const index = useRotation(products.length);
  const [fade] = useState(() => new Animated.Value(1));
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [index, fade]);
  const product: ProductPeek | null = products[index] ?? null;
  // No products yet: the hero's own lowest price and photo.
  const shown = product ?? (hero.price ? { name: '', price: hero.price.amount, mrp: hero.price.mrp, imageUrl: photosFor(hero.id, hero.imageUrls, 1)[0]! } : null);
  const photo = shown?.imageUrl ?? photosFor(hero.id, hero.imageUrls, 1)[0]!;
  const mrp = shown && shown.mrp != null && shown.mrp > shown.price ? shown.mrp : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="today-hero"
      accessibilityLabel={`${hero.title}, ${hero.tag}${shown ? `. ${shown.name ? `${shown.name}, ` : ''}${rupees(shown.price)}` : ''}`}
      className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={hero.tag} />
      <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} className="mt-2 px-1.5 text-center text-[16px] font-semibold leading-[19px] tracking-[-0.3px] text-ink">{hero.title}</Text>
      <Animated.View className="w-full flex-1 items-center" style={{ opacity: fade }}>
        {shown ? (
          <View className="mt-2.5 items-center">
            {mrp != null ? (
              <View className="rounded-t-lg px-2 py-0.5" style={{ backgroundColor: TAG_LEAD_BG }}>
                <Text className="text-[12px] font-semibold text-white/75 line-through">{rupees(mrp)}</Text>
              </View>
            ) : null}
            <View className="rounded-xl px-3 py-0.5" style={{ backgroundColor: TAG_VALUE_BG }}>
              <Text className="text-[20px] font-bold tracking-[-0.4px]" style={{ color: TAG_VALUE_TEXT }}>{rupees(shown.price)}</Text>
            </View>
            {shown.name ? <Text numberOfLines={2} className="mt-1 px-1.5 text-center text-[13px] font-semibold leading-[16px] text-ink">{shown.name}</Text> : null}
          </View>
        ) : null}
        {/* Photo fills everything below, sitting on the card's foot. */}
        <View className="w-full flex-1 justify-end px-1.5 pb-1.5 pt-2">
          <AppImage source={{ uri: photo }} resizeMode="contain" accessible={false} testID="today-photo" style={{ width: '100%', height: '100%' }} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Index of the product on show; advances every ROTATE_MS while there is more
// than one, and stays put when the phone asks for reduced motion.
function useRotation(count: number) {
  const [index, setIndex] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled?.().then((on) => { if (live) setStill(!!on); }, () => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (count < 2 || still) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [count, still]);
  return count ? index % count : 0;
}
