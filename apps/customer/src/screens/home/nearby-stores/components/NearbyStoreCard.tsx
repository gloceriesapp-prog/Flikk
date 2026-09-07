// One store tile in the horizontal row — fixed-width landscape rounded card
// with the store name underneath. Bigger than before (w-36/h-28 image,
// text-sm name) now that NearbyStoresSection dropped its white-card wrapper
// — this tile needs to carry its own visual weight on the bare page bg.
// Presentational only; NearbyStoresSection owns navigation.
//
// Real photo (store.photoUrl, admin's Add Store form -> "store-images"
// Storage bucket) when the store has one, otherwise the shared placeholder
// image — no more random per-id stock photo (getStoreImageUri), same fix
// as ProductCardView's own note on why a random image is worse than a
// plain fallback.

import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../../components/AppImage';
import { colors } from '../../../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { NearbyStore } from '../useNearbyStores';

interface Props {
  store: NearbyStore;
  onPress: () => void;
}

export function NearbyStoreCard({ store, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="w-36 gap-2">
      <View className="h-28 w-36 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <Image source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
        {/* Closed is still tappable/browsable (useNearbyStores.ts's own
            note — the backend deliberately returns the true nearest store
            either way, no silent substitution) — this badge just makes
            that state visible instead of leaving someone to wonder why an
            order doesn't go through. */}
        {!store.isOpen && (
          <View className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1">
            <Text className="text-center text-[10px] font-semibold text-white" numberOfLines={1}>
              {store.openTime ? `Closed · opens ${store.openTime}` : 'Closed'}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-center text-base font-medium text-ink" numberOfLines={1}>
        {store.name}
      </Text>
      {/* Real distance from the customer's saved delivery location
          (useNearbyStores.ts's own note) — undefined for a store with no
          lat/lng on file yet, not a fabricated placeholder number. */}
      {store.distanceLabel && (
        <Text
          className="-mt-1 text-center text-xs"
          style={{ color: store.isOpen ? `${colors.ink}80` : colors.danger }}
          numberOfLines={1}
        >
          {store.distanceLabel} away{!store.isOpen ? ' · Closed' : ''}
        </Text>
      )}
    </Pressable>
  );
}
