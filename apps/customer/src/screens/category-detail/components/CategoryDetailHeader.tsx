import { ArrowLeft01Icon, ChevronDownIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useLocationStore } from '../../../store/useLocationStore';

interface Props {
  title: string;
  onBack: () => void;
  onSearch: () => void;
}

export function CategoryDetailHeader({ title, onBack, onSearch }: Props) {
  const location = useLocationStore((s) => s.location);
  const address = location?.addressLabel ?? 'Set your location';

  return (
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>

      <View className="flex-1">
        <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text className="flex-shrink text-xs font-semibold text-success" numberOfLines={1}>
            Delivering to: <Text className="font-medium text-ink/60">{address}</Text>
          </Text>
          <AppIcon icon={ChevronDownIcon} size={12} color={colors.limeDeep} />
        </View>
      </View>

      <Pressable onPress={onSearch} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={Search01Icon} size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}
