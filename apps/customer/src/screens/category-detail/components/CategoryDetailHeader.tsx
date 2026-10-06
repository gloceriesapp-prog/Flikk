import { ArrowLeft01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  title: string;
  onBack: () => void;
  onSearch: () => void;
}

export function CategoryDetailHeader({ title, onBack, onSearch }: Props) {
  return (
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>

      <View className="flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Search products" onPress={onSearch} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={Search01Icon} size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}
