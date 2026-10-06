// Navratri banner, category boxes and product rail, owned by FestivalTab.
import { ScrollView, Text, View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { ProductCard } from '../../products/ProductCard';
import type { Product } from '../../products/types';
import { FESTIVAL_CATEGORIES } from './data';
import { FestivalBanner } from '../banner/FestivalBanner';

// Smaller than every other Home row on purpose — the festival rail is a
// lighter accent under the greeting, not a primary browse row.
const CARD_WIDTH = 'w-28';
const CARD_SNAP_INTERVAL = 112 + 12; // w-28 (112px) + this row's gap-3 (12px)
const VISIBLE_PRODUCTS = 6;

// One tone per box, positional (Pooja Essentials / Fasting Favourites /
// Festive Treats & Gifts). Applied via inline style, not a bg-[#..] class —
// NativeWind can't compile a class picked at runtime from an array. Cycles
// if the backend ever sends more than 3 boxes.
const FESTIVAL_BOX_COLORS = ['#E8CFA9', '#D7DEC8', '#E6C9CC'] as const;

// One background image per box, positional (same order as the colors above).
// The color stays as the base fill (shows through while the image loads and
// behind any transparent art); cycles if the backend ever sends >3 boxes.
const FESTIVAL_BOX_IMAGES = [
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/puja.png',
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/puja2.png',
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/puja3.png',
] as const;

interface Props {
  products: Product[];
  // Greeting + category boxes come from useFestivalGreeting (backend-driven);
  // each falls back to the data.ts consts when missing/empty.
  title?: string;
  tagline?: string;
  categories?: { id: string; title: string }[];
}

export function FestivalGreetingSection({ products, categories }: Props) {
  const visibleProducts = products.slice(0, VISIBLE_PRODUCTS);
  const boxes = categories && categories.length > 0 ? categories : FESTIVAL_CATEGORIES;

  return (
    <View>
      {/* 1. Festival banner image (replaces the old text greeting). */}
      <FestivalBanner />

      {/* 2. Sample festival category boxes (image #89) — one tone per box
          (FESTIVAL_BOX_COLORS), bold title top-left, product-image collage
          bottom-right. 3 boxes split the device width evenly (no scroll).
          Placeholder art for now. */}
      <View className="flex-row gap-2.5 px-4 pt-4">
        {boxes.map((cat, i) => (
          <View
            key={cat.id}
            className="h-32 flex-1 overflow-hidden rounded-3xl p-3"
            style={{
              backgroundColor: FESTIVAL_BOX_COLORS[i % FESTIVAL_BOX_COLORS.length],
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text className="text-[13px] font-bold leading-[17px] text-[#3A2A22]">{cat.title}</Text>
            <Image
              source={{ uri: FESTIVAL_BOX_IMAGES[i % FESTIVAL_BOX_IMAGES.length] }}
              className="absolute -bottom-3 -right-1 h-24 w-24 opacity-90"
              resizeMode="contain"
            />
          </View>
        ))}
      </View>

      {/* 3. Real product cards — identical to every other Home row. */}
      {visibleProducts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-start gap-3 px-5 pt-4"
          snapToInterval={CARD_SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge compact />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
