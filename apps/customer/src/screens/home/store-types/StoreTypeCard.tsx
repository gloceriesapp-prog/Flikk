// One store-type tile — icon (not a photo, there's no per-category image)
// in a limeSoft circle + label, matching the design system's own
// selected/highlighted-surface token (CLAUDE.md's design tokens section).
// Presentational only; StoreTypesSection owns navigation.

import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { iconForStoreCategory } from './storeTypeIcons';
import type { StoreType } from './useStoreTypes';

interface Props {
  storeType: StoreType;
  onPress: () => void;
}

export function StoreTypeCard({ storeType, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="w-20 items-center gap-2">
      <View
        className="h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.limeSoft }}
      >
        <AppIcon icon={iconForStoreCategory(storeType.category)} size={26} color={colors.limeDeep} />
      </View>
      <Text className="text-center text-xs font-medium leading-4 text-ink" numberOfLines={2}>
        {storeType.category}
      </Text>
    </Pressable>
  );
}
