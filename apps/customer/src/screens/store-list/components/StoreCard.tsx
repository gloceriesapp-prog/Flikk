// Horizontal card, per the reference: square image on the left, name/desc/
// status stacked top-right, distance + "Shop now" sharing the bottom row.
// Status is never color-only — a dot + text label together, per
// specs/00-foundation/design-system.md's accessibility floor.

import { Location01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import type { StoreListing } from '../data';

interface Props {
  store: StoreListing;
}

export function StoreCard({ store }: Props) {
  return (
    <View className="flex-row items-center gap-3 rounded-3xl border border-gray-100 bg-white p-3">
      <View className="h-24 w-24 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>

      <View className="flex-1 gap-2.5">
        <View>
          <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
            {store.name}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-xs text-ink/55" numberOfLines={1}>
              {store.description}
            </Text>
            <View className="flex-row items-center gap-1">
              <View className={`h-1.5 w-1.5 rounded-full ${store.isOpen ? 'bg-success' : 'bg-danger'}`} />
              <Text className={`text-xs font-semibold ${store.isOpen ? 'text-success' : 'text-danger'}`}>
                {store.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <AppIcon icon={Location01Icon} size={13} color={colors.limeDeep} />
            <Text className="text-sm font-semibold text-ink/70">{store.distanceKm} km</Text>
          </View>
          <Pressable className="rounded-full bg-coral px-4 py-2">
            <Text className="text-xs font-bold text-white">Shop now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
