import { Text, View } from 'react-native';
import { CategoryTile } from './CategoryTile';
import type { RemoteCategorySection } from './useCategorySections';

interface Props {
  section: RemoteCategorySection;
}

const COLUMNS = 4;

export function CategorySectionGroup({ section }: Props) {
  return (
    <View className="px-5 pt-6">
      <Text className="mb-4 text-lg font-medium text-ink">{section.name}</Text>
      {/* justify-between used to space tiles evenly across the FULL row
          width — correct when a row happens to have exactly 4 items, but
          with fewer (a section that only has 1-3 categories, or the last,
          partial row of a longer one) it stretched them out to the row's
          two edges with a huge gap in between instead of packing them
          together from the left. flex-start + an explicit right margin on
          every tile except the last in each row of 4 keeps the same visual
          gap regardless of how many tiles are actually in that row. */}
      <View className="flex-row flex-wrap justify-start gap-y-5">
        {section.categories.map((item, index) => (
          <CategoryTile key={item.id} category={item} marginRight={index % COLUMNS === COLUMNS - 1 ? 0 : '2.6667%'} />
        ))}
      </View>
    </View>
  );
}
