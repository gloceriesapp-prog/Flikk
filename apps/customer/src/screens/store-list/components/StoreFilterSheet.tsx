// Bottom sheet opened by StoreFilterBar's sliders icon (and by its "Sort
// by"/"Category"/"Rating" chips, as shortcuts into the same sheet rather
// than three separate ones) — same bottom-sheet-with-checkmark shape
// OrderStatusFilterSheet.tsx already uses on Purchase, kept consistent
// rather than inventing a new picker pattern for this screen.
//
// Category replaces the old CategoryFilterBar's own chip row (that whole
// component — search/heart icons + always-visible category chips — got
// removed per an explicit ask in favor of this bar); Sort/Rating are real
// store fields (useAllStores.ts's own RealStore) — no "Cuisine"/"Price"
// here the way a restaurant-discovery app's filter bar has (this
// reference is grocery/kirana stores, not restaurants): "Fastest
// delivery" sorts by avg_prep_minutes (the same real prep-time column
// TrackOrderScreen's ETA math uses), "Top rated" by rating. Both are
// nullable on the real row — stores missing either just sort to the end
// rather than crashing or faking a number.

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export type StoreSort = 'relevance' | 'rating' | 'fastest';
export type MinRating = 0 | 4 | 4.5;

const SORT_OPTIONS: { value: StoreSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Top rated' },
  { value: 'fastest', label: 'Fastest delivery' },
];

const RATING_OPTIONS: { value: MinRating; label: string }[] = [
  { value: 0, label: 'Any rating' },
  { value: 4, label: '4.0 and above' },
  { value: 4.5, label: '4.5 and above' },
];

interface Props {
  visible: boolean;
  sort: StoreSort;
  minRating: MinRating;
  categories: string[];
  selectedCategory: string;
  onChangeSort: (value: StoreSort) => void;
  onChangeMinRating: (value: MinRating) => void;
  onChangeCategory: (value: string) => void;
  onClose: () => void;
}

export function StoreFilterSheet({
  visible,
  sort,
  minRating,
  categories,
  selectedCategory,
  onChangeSort,
  onChangeMinRating,
  onChangeCategory,
  onClose,
}: Props) {
  const categoryOptions = ['All', ...categories];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="rounded-t-3xl bg-white pb-safe" onPress={(e) => e.stopPropagation()}>
          <ScrollView className="max-h-[70%]">
            <Text className="px-5 pt-5 text-[15px] font-semibold text-ink">Category</Text>
            {categoryOptions.map((category) => (
              <Pressable
                key={category}
                onPress={() => onChangeCategory(category)}
                className="flex-row items-center gap-3.5 px-5 py-3.5"
              >
                <Text className="flex-1 text-[15px] font-medium text-ink">{category}</Text>
                {selectedCategory === category && (
                  <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.ink} strokeWidth={1.8} />
                )}
              </Pressable>
            ))}

            <View className="mx-5 h-px bg-gray-100" />

            <Text className="px-5 pt-4 text-[15px] font-semibold text-ink">Sort by</Text>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onChangeSort(option.value)}
                className="flex-row items-center gap-3.5 px-5 py-3.5"
              >
                <Text className="flex-1 text-[15px] font-medium text-ink">{option.label}</Text>
                {sort === option.value && <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.ink} strokeWidth={1.8} />}
              </Pressable>
            ))}

            <View className="mx-5 h-px bg-gray-100" />

            <Text className="px-5 pt-4 text-[15px] font-semibold text-ink">Rating</Text>
            {RATING_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onChangeMinRating(option.value)}
                className="flex-row items-center gap-3.5 px-5 py-3.5"
              >
                <Text className="flex-1 text-[15px] font-medium text-ink">{option.label}</Text>
                {minRating === option.value && <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.ink} strokeWidth={1.8} />}
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={onClose} className="mx-5 mb-2 mt-3 items-center rounded-full bg-ink py-3.5">
            <Text className="text-[15px] font-semibold text-white">Apply</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
