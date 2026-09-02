// One store-type chip — icon (not a photo, there's no per-category image)
// + label side by side in a single rounded pill, not the old icon-circle-
// with-label-wrapping-below layout. One line always (numberOfLines={1}, no
// wrap to two lines like "Kirana & Grocery" used to). Flat neutral gray
// fill (#F3F4F6, same tone the cart/product-card image tiles already
// settled on), not the lime-soft brand tint — deliberately plain so it
// doesn't compete with the coral "Your Favorites" chip next to it.
// Presentational only; StoreTypesSection owns navigation.

import { Pressable, Text } from 'react-native';
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
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
      style={{ backgroundColor: '#f7f7f7' }}
    >
      <AppIcon icon={iconForStoreCategory(storeType.category)} size={18} color={colors.ink} />
      <Text className="text-[13px] font-medium text-ink" numberOfLines={1}>
        {storeType.category}
      </Text>
    </Pressable>
  );
}
