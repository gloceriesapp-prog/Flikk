// "Shop by category" — a quick-jump card grid shown only on the sidebar's
// 'All' view, above the flat product list. Redesigned per an explicit
// reference image: a plain rounded photo tile with the label BELOW it
// (bold, centered), not overlaid inside the card — closer to a real
// grocery app's category rail than the earlier "mood card" treatment.
// Each card's photo is the first real product photo in that category
// (server facet, GET /stores/:id/category-facets) — an honest "here's what this category actually looks
// like" cover, not an invented occasion tag.
//
// Tapping a card selects that category the same way tapping its sidebar
// entry does (same selectedId state, StoreDetailScreen owns it) — this is
// just a second, richer entry point into the exact same filter, not a
// separate concept.

import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import type { StoreCategory } from '../useStoreProducts';
import { useCopy } from '../../../api/appConfig';

interface Props {
  categories: StoreCategory[];
  onSelect: (id: string) => void;
}

export function StoreCategoryGrid({ categories, onSelect }: Props) {
  const title = useCopy('store.categories.title');
  // 'All' itself doesn't need its own card in a grid whose whole purpose
  // is jumping INTO a specific category. No dummy fallback (
  // dummyStoreCategories.ts removed per an explicit ask) — renders
  // nothing while a store has no real categories beyond 'All'.
  const realCategories = categories.filter((c) => c.id !== 'all');
  const cards = realCategories.map((c) => ({ id: c.id, label: c.label, imageUrl: c.imageUrl }));

  if (cards.length === 0) return null;

  return (
    <View className="mb-5 w-full">
      <Text className="mb-3 px-1 text-lg font-semibold text-ink">{title}</Text>
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
