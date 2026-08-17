import { View } from 'react-native';
import { QuickCategoryChip } from './QuickCategoryChip';
import { QUICK_CATEGORIES } from '../data';

export function QuickCategoryGrid() {
  return (
    <View className="flex-row flex-wrap gap-2.5 px-5 pt-4">
      {QUICK_CATEGORIES.map((category) => (
        <QuickCategoryChip key={category.id} category={category} />
      ))}
    </View>
  );
}
