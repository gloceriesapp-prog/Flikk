// Hero promo card for today's featured store — lime-deep -> ink diagonal
// gradient panel (name/hours/CTA) on the left, the store's own real photo
// (store.photoUrl, admin's Add Store form -> "store-images" bucket) filling
// the right side as a proper rounded, cover-fit image blending into the
// gradient via an overlay — not the old hardcoded FEATURED_PRODUCT_IMAGE_URI
// PNG, which was a fixed placeholder unrelated to the actual featured store
// and never changed no matter which store was featured. A cover-fit photo
// can't do the old "transparent PNG spilling past the frame" trick (real
// store photos are opaque JPEGs with real backgrounds), so the image is
// contained within the card now instead of floating outside it.
//
// Real store data (useFeaturedStore.ts -> GET /stores) — name, open/close
// hours, photo, same store row a founder fills in on admin's Add Store
// form. Renders nothing while there's no store yet.

import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import { useFeaturedStore } from './useFeaturedStore';
import type { AppStackParamList } from '../../../navigation/types';

export function FeaturedStoreBanner() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: store } = useFeaturedStore();

  if (!store) return null;

  const hours = store.openTime && store.closeTime ? `Open ${store.openTime} – ${store.closeTime}` : undefined;

  return (
    <View className="px-5 pt-6">
      <View className="h-48 flex-row overflow-hidden rounded-3xl shadow-lg shadow-black/20">
        <LinearGradient
          colors={[colors.limeDeep, colors.ink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: '58%', paddingVertical: 24, paddingHorizontal: 20, justifyContent: 'space-between' }}
        >
          <View>
            <Text className="text-xl font-extrabold leading-6 text-white" numberOfLines={2} adjustsFontSizeToFit>
              {store.name}
            </Text>
            {hours && (
              <Text className="mt-1.5 text-xs font-medium text-white/70" numberOfLines={1}>
                {hours}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
            className="flex-row items-center gap-2 self-start rounded-full bg-white px-4 py-2.5"
          >
            <View className="h-6 w-6 items-center justify-center rounded-full bg-lime-soft">
              <AppIcon icon={ArrowUpRight01Icon} size={13} color={colors.limeDeep} strokeWidth={2.2} />
            </View>
            <Text className="text-xs font-extrabold tracking-wide text-ink">SHOP NOW</Text>
          </Pressable>
        </LinearGradient>

        <View className="flex-1">
          <Image
            source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }}
            className="h-full w-full"
            resizeMode="cover"
          />
          {/* Blends the photo's left edge into the gradient panel instead of
              a hard seam between the two. */}
          <LinearGradient
            colors={[colors.ink, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    </View>
  );
}
