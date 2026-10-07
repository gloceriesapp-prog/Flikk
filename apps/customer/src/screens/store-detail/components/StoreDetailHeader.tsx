// Dedicated header for StoreDetailScreen — NOT the shared
// category-detail/components/CategoryDetailHeader.tsx. That header is also
// used by CategoryDetailScreen (Home's own category tabs), so redesigning
// it in place would silently change that screen's look too; this is its
// own file specifically so a store-detail-only redesign stays scoped to
// store-detail.
//
// Same real data as before (store name, useLocationStore's real saved
// address, real back/search navigation) — bigger/bolder store name, a
// soft bottom hairline instead of a hard content cut, and tighter spacing,
// per an explicit "make this look premium and wow" ask.

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

export function StoreDetailHeader({ title, onBack, onSearch }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Same real-address rule as CategoryDetailHeader — only ever set by a
  // real GPS reverse-geocode or a real search pick, never a canned string.
  const location = useLocationStore((s) => s.location);
  const address = location?.addressLabel ?? 'Set your location';

  return (
    <View className="border-b border-black/[0.05] bg-white px-5 pb-4 pt-2">
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>

        <View className="flex-1">
          <Text className="text-xl font-semibold text-ink" numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('LocationSearch')}
            hitSlop={6}
            className="mt-0.5 flex-row items-center gap-0.5 self-start"
          >
            <Text className="flex-shrink text-[13px] font-semibold text-[#4C5FE0]" numberOfLines={1}>
              Delivering to: <Text className="font-medium text-ink/60">{address}</Text>
            </Text>
            <AppIcon icon={ChevronDownIcon} size={12} color={colors.limeDeep} />
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Search this store"
          onPress={onSearch}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F5F5F4' }}
        >
          <AppIcon icon={Search01Icon} size={19} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
