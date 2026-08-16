import { Text, View } from 'react-native';
import { CategoryTile } from './CategoryTile';
import type { CategorySectionData } from '../data';

interface Props {
  section: CategorySectionData;
}

export function CategorySectionGroup({ section }: Props) {
  return (
    <View className="px-5 pt-6">
      <Text className="mb-4 text-lg font-extrabold text-ink">{section.title}</Text>
      <View className="flex-row flex-wrap justify-between gap-y-5">
        {section.items.map((item) => (
          <CategoryTile key={item.id} category={item} />
        ))}
      </View>
    </View>
  );
}
