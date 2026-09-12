// "Shop by category" — a quick-jump card grid shown only on the sidebar's
// 'All' view, above the flat product list. Redesigned per an explicit
// reference image: a plain rounded photo tile with the label BELOW it
// (bold, centered), not overlaid inside the card — closer to a real
// grocery app's category rail than the earlier "mood card" treatment.
// Each card's photo is the first real product photo found in that
// category (already a real admin-uploaded photo, not a placeholder chosen
// to look nice) — an honest "here's what this category actually looks
// like" cover, not an invented occasion tag.
//
// Tapping a card selects that category the same way tapping its sidebar
// entry does (same selectedId state, StoreDetailScreen owns it) — this is
// just a second, richer entry point into the exact same filter, not a
// separate concept.

import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { Product } from '../../home/products/types';
import type { StoreCategory } from '../useStoreProducts';

interface Props {
  categories: StoreCategory[];
  products: Product[];
  onSelect: (id: string) => void;
}

export function StoreCategoryGrid({ categories, products, onSelect }: Props) {
  // 'All' itself doesn't need its own card in a grid whose whole purpose
  // is jumping INTO a specific category. No dummy fallback (
  // dummyStoreCategories.ts removed per an explicit ask) — renders
  // nothing while a store has no real categories beyond 'All'.
  const realCategories = categories.filter((c) => c.id !== 'all');
  const cards = realCategories.map((c) => ({ id: c.id, label: c.label, imageUrl: products.find((p) => p.categoryLabel === c.label)?.imageUrl }));

  if (cards.length === 0) return null;

  return (
    <View className="mb-5 w-full">
      <Text className="mb-3 px-1 text-lg font-semibold text-ink">Shop by category</Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {cards.map((card) => (
          <Pressable key={card.id} onPress={() => onSelect(card.id)} className="w-[31%] items-center">
            <View
              className="w-full overflow-hidden rounded-2xl bg-[#F4F4F2] shadow-sm shadow-black/10"
              style={{ height: 96 }}
            >
              <Image source={{ uri: card.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
            </View>
            <Text className="mt-2 text-center text-[12.5px] font-medium leading-4 text-ink" numberOfLines={2}>
              {card.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
