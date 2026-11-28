import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../../components/AppImage';
import type { GridCard, ProductPeek } from '../api';
import { photosFor } from '../fallbackPhotos';
import { BORDER, RADIUS, TAG_LEAD_BG, TAG_VALUE_BG, TAG_VALUE_TEXT, titleMetrics } from '../layout';
import { CardTag } from './CardTag';

export const ROTATE_MS = 3000;
const SLIDE_MS = 450;
const rupees = (value: number) => `₹${Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(2)}`;
type Slide = { key: string; name: string; price: number; mrp: number | null; imageUrl: string };

// Tall deal card: tag tab, title, then its products (up to 4) sliding right
// to left every 3 s: MRP struck on the dark chip (only when real), store
// price on the lime chip, name, photo at the foot.
export function TodayHero({ hero, width, height, onPress }: { hero: GridCard; width: number; height: number; onPress: () => void }) {
  const slides = heroSlides(hero);
  // The first slide is repeated at the end so the last one slides on to it.
  const track = slides.length > 1 ? [...slides, { ...slides[0]!, key: `${slides[0]!.key}-loop` }] : slides;
  const x = useSlide(slides.length, width);
  const first = slides[0];
  const title = titleMetrics(width);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="today-hero"
      accessibilityLabel={`${hero.title}, ${hero.tag}${first ? `. ${first.name ? `${first.name}, ` : ''}${rupees(first.price)}` : ''}`}
      className="items-center overflow-hidden bg-white active:opacity-90"
      style={{ width, height, borderRadius: RADIUS, borderWidth: 1, borderColor: BORDER }}>
      <CardTag label={hero.tag} />
      {/* Same title size and two-line box as the other cards. */}
      <Text numberOfLines={2} className="mt-1.5 px-1.5 text-center font-semibold tracking-[-0.2px] text-ink"
        style={{ fontSize: title.size, lineHeight: title.line, height: title.height }}>{hero.title}</Text>
      <View className="w-full flex-1 overflow-hidden">
        <Animated.View className="h-full flex-row" style={{ width: width * track.length, transform: [{ translateX: x }] }} testID="today-hero-track">
          {track.map((slide) => <HeroSlide key={slide.key} slide={slide} width={width} />)}
        </Animated.View>
      </View>
    </Pressable>
  );
}

function HeroSlide({ slide, width }: { slide: Slide; width: number }) {
  const mrp = slide.mrp != null && slide.mrp > slide.price ? slide.mrp : null;
  return (
    <View className="h-full items-center" style={{ width }}>
      <View className="mt-2.5 items-center">
        {mrp != null ? (
          <View className="rounded-t-lg px-2 py-0.5" style={{ backgroundColor: TAG_LEAD_BG }}>
            <Text className="text-[12px] font-semibold text-white/75 line-through">{rupees(mrp)}</Text>
          </View>
        ) : null}
        <View className="rounded-xl px-3 py-0.5" style={{ backgroundColor: TAG_VALUE_BG }}>
          <Text className="text-[20px] font-bold tracking-[-0.4px]" style={{ color: TAG_VALUE_TEXT }}>{rupees(slide.price)}</Text>
        </View>
        {slide.name ? <Text numberOfLines={2} className="mt-1 px-1.5 text-center text-[13px] font-semibold leading-[16px] text-ink">{slide.name}</Text> : null}
      </View>
      {/* Photo fills everything below, sitting on the card's foot. */}
      <View className="w-full flex-1 justify-end px-1.5 pb-1.5 pt-2">
        <AppImage source={{ uri: slide.imageUrl }} resizeMode="contain" accessible={false} testID="today-photo" style={{ width: '100%', height: '100%' }} />
      </View>
    </View>
  );
}

// The hero's products; with none, its own lowest price and photo.
function heroSlides(hero: GridCard): Slide[] {
  const products: ProductPeek[] = hero.products ?? [];
  if (products.length) return products.map((p) => ({ key: p.id, name: p.name, price: p.price, mrp: p.mrp, imageUrl: p.imageUrl }));
  if (!hero.price) return [];
  return [{ key: hero.id, name: '', price: hero.price.amount, mrp: hero.price.mrp, imageUrl: photosFor(hero.id, hero.imageUrls, 1)[0]! }];
}

// Track offset: every ROTATE_MS slide one card width left (next comes in from
// the right). After the loop copy, jump back to the start unseen. Still when
// there is one slide or the phone asks for reduced motion.
function useSlide(count: number, width: number) {
  const [x] = useState(() => new Animated.Value(0));
  const [still, setStill] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled?.().then((on) => { if (live) setStill(!!on); }, () => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    x.setValue(0);
    if (count < 2 || still) return;
    let at = 0;
    const timer = setInterval(() => {
      at += 1;
      Animated.timing(x, { toValue: -at * width, duration: SLIDE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished && at >= count) { at = 0; x.setValue(0); }
      });
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [count, width, still, x]);
  return x;
}
