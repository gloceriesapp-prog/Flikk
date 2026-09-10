// "Nearest to you" — real horizontal card row below StoreFilterBar. Real
// fields only: photo (store.photoUrl, falls back to the shared placeholder
// same as StoreCard.tsx), rating (store.rating), distance (real, server-
// computed haversine via useNearestStores.ts — not a dummy per-card hash),
// name, category. The bookmark button is the same real toggle
// StoreCard.tsx's own heart button uses (useLikedStoresStore), just a
// bookmark glyph here to match this card's own reference layout instead
// of a heart.
//
// No discount/price-for-two tag — a reference this was modeled on showed
// one, but there's no per-store discount or "price for two" concept
// anywhere in this schema (that's a restaurant-app idea; Flikk sells
// per-product, per-store, discounts live on individual products'
// original_price, never on a store as a whole). Fabricating a flat "40%
// off" here would be exactly the kind of dummy content this app has been
// deliberately stripped of elsewhere — left out rather than invented.

import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { AppImage as Image, prefetchImages } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { useLikedStoresStore } from '../../../store/useLikedStoresStore';
import { getStoreStatusText } from '../storeHours';
import { useNearestStores, type NearestStore } from './useNearestStores';
import type { AppStackParamList } from '../../../navigation/types';

const CARD_WIDTH = 220;
const PHOTO_HEIGHT = 150;

function NearestStoreCard({ store }: { store: NearestStore }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isLiked = useLikedStoresStore((state) => state.isLiked(store.id));
  const toggleLiked = useLikedStoresStore((state) => state.toggle);
  const status = getStoreStatusText(store.isOpen, store.openTime, store.closeTime);

  return (
    <Pressable
      onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
      style={{ width: CARD_WIDTH }}
    >
      <View className="overflow-hidden rounded-[22px] bg-white shadow-md shadow-black/10">
        <View style={{ height: PHOTO_HEIGHT }}>
          <Image source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }} style={{ flex: 1 }} contentFit="cover" />

          <Pressable
            onPress={() => toggleLiked(store.id)}
            hitSlop={8}
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-xl bg-white/90"
          >
            <AppIcon
              icon={Bookmark01Icon}
              size={17}
              color={isLiked ? colors.limeDeep : colors.ink}
              fill={isLiked ? colors.limeDeep : undefined}
              strokeWidth={isLiked ? 0 : 1.8}
            />
          </Pressable>

          {/* Overlaps the photo/info-card seam, same "badge floating on
              the boundary" idea StoreCard.tsx's own header note describes
              from its earlier pass — real rating, no fabricated review
              count riding along with it here. */}
          {store.rating !== undefined && (
            <View
              className="absolute flex-row items-center gap-1 rounded-lg bg-success px-2 py-1"
              style={{ bottom: -12, left: 12 }}
            >
              <Text className="text-[12.5px] font-semibold text-white">{store.rating.toFixed(1)}</Text>
              <AppIcon icon={StarIcon} size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
            </View>
          )}
        </View>

        {/* #F7F7F7, not pure white — a deliberately slightly-off-white
            panel per an explicit ask/reference, distinct from the plain
            white page background behind the whole card. */}
        <View className="gap-1 px-3.5 pb-3.5 pt-4" style={{ backgroundColor: '#F7F7F7' }}>
          <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>
            {store.name}
          </Text>
          {/* Real is_active/close_time (same convention StoreCard.tsx
              already uses) — open/closed status, not a fabricated
              "₹X for two" price line from the reference this replaced. */}
          <Text className="text-[13px] font-medium" numberOfLines={1}>
            <Text className="text-ink/65">{store.distanceKm.toFixed(1)}km · </Text>
            <Text style={{ color: status.word === 'Open' ? colors.success : colors.danger }}>{status.word}</Text>
            {status.suffix ? (
              <Text style={{ color: status.urgent ? colors.gold : colors.ink }}>{status.suffix}</Text>
            ) : null}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function NearestToYouSection() {
  const { data: stores = [] } = useNearestStores();

  useEffect(() => {
    prefetchImages(stores.map((store) => store.photoUrl || PLACEHOLDER_IMAGE_URI));
  }, [stores]);

  if (stores.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-[18px] font-bold text-ink">Nearest to you</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3.5 px-5">
        {stores.map((store) => (
          <NearestStoreCard key={store.id} store={store} />
        ))}
      </ScrollView>
    </View>
  );
}
