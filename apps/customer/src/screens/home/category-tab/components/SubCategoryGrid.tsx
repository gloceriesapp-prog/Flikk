import { Text, View } from 'react-native';
import { SubCategoryTile } from './SubCategoryTile';
import type { SubCategory } from '../types';

interface Props {
  title: string;
  items: SubCategory[];
}

export function SubCategoryGrid({ title, items }: Props) {
  return (
    <View className="px-5 pt-6">
      <Text className="mb-4 text-lg font-extrabold text-ink">{title}</Text>
      <View className="flex-row flex-wrap justify-between gap-y-4">
        {items.map((category) => (
          <SubCategoryTile key={category.id} category={category} />
        ))}
      </View>
    </View>
  );
}
