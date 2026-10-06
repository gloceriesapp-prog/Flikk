import { Text, View } from 'react-native';
import { CategoryTile } from './CategoryTile';
import type { RemoteCategorySection } from './useCategorySections';

interface Props {
  section: RemoteCategorySection;
}

// Exactly 4 columns, guaranteed — each cell is a true 25% width (not
// 23%+margin, which summed to just over 100% once floating-point rounding
// hit all 4 columns in a full row and made Yoga wrap the 4th tile early,
// same bug as category-tab/components/SubCategoryGrid.tsx's own note). The
// visual gap comes from equal padding on every cell plus a matching
// negative margin on the row, not from arithmetic that has to land on
// exactly 100%. Also fixes the older justify-between issue this replaced —
// a partial row (1-3 items) still packs left instead of stretching to the
// row's two edges.
const GAP = 12;

export function CategorySectionGroup({ section }: Props) {
  return (
    <View className="px-5 pt-8">
      {/* Same visual spec as home/components/SectionTitle, kept inline (no
          px-5) because this wrapper already owns the px-5 gutter the grid's
          negative-margin math bleeds into. */}
      <Text className="mb-4 text-xl font-bold tracking-tight text-ink/90">{section.name}</Text>
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -GAP / 2 }}>
        {section.categories.map((item) => (
          <View key={item.id} style={{ width: '25%', paddingHorizontal: GAP / 2, paddingBottom: 20 }}>
            <CategoryTile category={item} />
          </View>
        ))}
      </View>
    </View>
  );
}
