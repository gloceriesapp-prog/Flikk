// Third redesign — bordered card per an explicit reference (rating badge
// overlaying the photo, bookmark top-right, name/category/open-status
// block, a divider, then a footer info row) replacing the previous flat
// Google-Maps-listing shape entirely (no more 3-photo strip, no Shop now/
// Share buttons — this card now only ever navigates to StoreDetail on tap,
// same as everywhere else a store card appears in this app).
//
// No "Flat X% OFF" pill, unlike the reference — there is no per-store
// discount concept anywhere in this schema (same reasoning
// StorePromoBanner.tsx/NearestToYouSection.tsx's own header notes already
// give): discounts live on individual products' original_price, never on
// a store as a whole. Fabricating one here would be exactly the dummy
// content this app has been deliberately stripped of elsewhere.
//
// No "price for two"/"Bookings available" either — both are restaurant-
// booking concepts with no equivalent in a grocery-delivery schema. The
// footer row is real instead: avg_prep_minutes (the same real prep-time
// column TrackOrderScreen's own ETA math already uses), not a restaurant
// reservation time.

import { Bookmark01Icon, ArrowRight01Icon, Clock01Icon, Location01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { useLikedStoresStore } from '../../../store/useLikedStoresStore';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { getStoreStatusText } from '../storeHours';
import { getDeliveryMessage } from '../deliveryMessage';
import type { AppStackParamList } from '../../../navigation/types';
import type { RealStore } from '../all-stores/useAllStores';

interface Props {
  store: RealStore;
}

const PHOTO_SIZE = 108;

export function StoreCard({ store }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isLiked = useLikedStoresStore((state) => state.isLiked(store.id));
  const toggleLiked = useLikedStoresStore((state) => state.toggle);

  function goToStore() {
    navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name });
  }

  const status = getStoreStatusText(store.isOpen, store.openTime, store.closeTime);

  return (
    <Pressable
      onPress={goToStore}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-black/5"
    >
      <View className="flex-row gap-3 p-3">
        <View style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }}>
          <Image
            source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }}
            style={{ flex: 1 }}
            className="rounded-xl bg-mist"
            contentFit="cover"
          />
          {/* Real rating (store.rating), same overlay-on-photo treatment
              NearestToYouSection.tsx's own cards use — no fabricated
              review count riding along with it. */}
          {store.rating !== undefined && (
            <View className="absolute left-1.5 top-1.5 flex-row items-center gap-1 rounded-lg bg-success px-1.5 py-0.5">
              <Text className="text-[12px] font-bold text-white">{store.rating.toFixed(1)}</Text>
              <AppIcon icon={StarIcon} size={10} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
            </View>
          )}
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-2">
            {/* 2 lines, not 1 — a real store name (per the founder's own
                Add Store form, no length cap there) was getting cut off
                mid-word ("Ammanna Enterprises S...") on a single line at
                this card's own column width. */}
            <Text className="flex-1 text-[16px] font-semibold leading-5 text-ink" numberOfLines={2}>
              {store.name}
            </Text>
            <Pressable onPress={() => toggleLiked(store.id)} hitSlop={8}>
              <AppIcon
                icon={Bookmark01Icon}
                size={19}
                color={isLiked ? colors.limeDeep : colors.ink}
                fill={isLiked ? colors.limeDeep : undefined}
                strokeWidth={isLiked ? 0 : 1.8}
              />
            </Pressable>
          </View>

          <Text className="text-[12.5px] font-medium text-ink/50" numberOfLines={1}>
            Category: {store.category}
          </Text>

          {/* Full real address — stores.address_line + city + district
              (useAllStores.ts's own real columns). A location-pin icon
              in front, per an explicit ask, instead of bare text.
              Falls back gracefully to whichever of the three a given
              store actually has on file rather than showing an empty
              line or a fabricated one. */}
          {(store.addressLine || store.city || store.district) && (
            <View className="flex-row items-start gap-1">
              <View className="mt-0.5">
                <AppIcon icon={Location01Icon} size={12} color={`${colors.ink}80`} strokeWidth={1.8} />
              </View>
              <Text className="flex-1 text-[12.5px] font-medium text-ink/50" numberOfLines={2}>
                {[store.addressLine, store.district, store.city].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* Real is_active/open_time/close_time — green while open, red
              while closed. The suffix swaps from the plain clock time to
              a real countdown ("Closing in 1h 30m"/"Opens in 45m",
              storeHours.ts's own getStoreStatusText) once the gap is
              inside the urgency window — gold, not plain black, so it
              actually reads as time-sensitive. Recomputed per render, not
              a live-ticking timer (this file's own note on why). */}
          <Text className="text-[13px] font-medium">
            <Text style={{ color: status.word === 'Open' ? colors.success : colors.danger }}>{status.word}</Text>
            {status.suffix ? <Text style={{ color: status.urgent ? colors.gold : colors.ink }}>{status.suffix}</Text> : null}
          </Text>
        </View>
      </View>

      <View className="h-px bg-gray-100" />

      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <AppIcon icon={Clock01Icon} size={15} color={colors.ink} strokeWidth={1.8} />
          {/* Varied, honest fallback lines instead of literally the same
              "Delivery time varies" on every card with no real prep time
              on file yet (deliveryMessage.ts's own note on why these are
              never a fabricated number). */}
          <Text className="text-[13px] font-medium text-ink/70">{getDeliveryMessage(store.id, store.avgPrepMinutes)}</Text>
        </View>
        <AppIcon icon={ArrowRight01Icon} size={16} color={`${colors.ink}80`} strokeWidth={2} />
      </View>
    </Pressable>
  );
}
