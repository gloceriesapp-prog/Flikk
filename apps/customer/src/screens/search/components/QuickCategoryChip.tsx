import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { QuickCategory } from '../data';

interface Props {
  category: QuickCategory;
}

export function QuickCategoryChip({ category }: Props) {
  return (
    <Pressable className="flex-row items-center gap-2.5 rounded-2xl border border-mist px-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-lime-soft">
        <AppIcon icon={category.icon} size={18} color={colors.limeDeep} />
      </View>
      <Text className="text-sm font-bold text-ink">{category.label}</Text>
    </Pressable>
  );
}
