import { ArrowLeft01Icon, ChevronDownIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useLocationStore } from '../../../store/useLocationStore';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  title: string;
  onBack: () => void;
  onSearch: () => void;
}

export function CategoryDetailHeader({ title, onBack, onSearch }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // useLocationStore.location is only ever set by LocationSearchScreen —
  // real GPS reverse-geocode or a real search result the user picked (see
  // that screen's own notes), never a canned/fallback address. "Set your
  // location" only shows before the user has picked anything at all.
  const location = useLocationStore((s) => s.location);
  const address = location?.addressLabel ?? 'Set your location';

  return (
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>

      <View className="flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {/* Chevron implied this row was tappable but had no onPress wired —
            it now opens the real address picker (LocationSearchScreen),
            same destination LocationSelector.tsx (Home's own header) uses. */}
        <Pressable
          onPress={() => navigation.navigate('LocationSearch')}
          hitSlop={6}
          className="flex-row items-center gap-0.5 self-start"
        >
          <Text className="flex-shrink text-xs font-semibold text-success" numberOfLines={1}>
            Delivering to: <Text className="font-medium text-ink/60">{address}</Text>
          </Text>
          <AppIcon icon={ChevronDownIcon} size={12} color={colors.limeDeep} />
        </Pressable>
      </View>

      <Pressable onPress={onSearch} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={Search01Icon} size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}
