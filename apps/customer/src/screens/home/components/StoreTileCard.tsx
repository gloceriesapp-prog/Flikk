// Generic store tile — fixed-width landscape rounded card, photo + name +
// an optional one-line meta caption underneath (distance for "Shop Any
// Store Nearby", a rating for "Top Rated Stores Near You", a "New" badge
// for "New on Flikk"). One card, one look, reused by every Home row that's
// fundamentally "a row of real stores" — same reasoning PromoListCard
// (home/products/) consolidates every "title + product row" section
// behind one component instead of each section keeping its own copy.
//
// Extracted from nearby-stores/components/NearbyStoreCard.tsx, which this
// replaces — that component's own `distanceLabel` became this one's
// generic `metaLabel`, computed by each section's own hook instead of
// this card knowing anything about distance/rating/recency itself.
//
// Real photo (store.photoUrl, admin's Add Store form -> "store-images"
// Storage bucket) when the store has one, otherwise the shared placeholder
// image — no random per-id stock photo, same fix ProductCardView's own
// note documents for products.

import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';

export interface StoreTile {
  id: string;
  name: string;
  photoUrl?: string;
  isOpen: boolean;
  openTime?: string;
  // One line of context under the name — what it means is entirely up to
  // the caller (distance, rating, "New"); this card just renders it in the
  // same slot/style every time, colored danger when the store is closed
  // (matching the old distance-specific behavior) and muted ink otherwise.
  metaLabel?: string;
}

interface Props {
  store: StoreTile;
  onPress: () => void;
}

export function StoreTileCard({ store, onPress }: Props) {
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
      <Text className="text-base font-medium text-ink" numberOfLines={1}>
        {store.name}
      </Text>
      {store.metaLabel && (
        <Text
          className="-mt-2 text-xs font-medium"
          style={{ color: store.isOpen ? `${colors.ink}80` : colors.danger }}
          numberOfLines={1}
        >
          {store.metaLabel}
        </Text>
      )}
    </Pressable>
  );
}
