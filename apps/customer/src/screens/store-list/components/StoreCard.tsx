// Full-bleed background photo, not a boxed thumbnail — sharpest on the
// left, fading via LinearGradient into the card's own #F7F8F6 tone toward
// the right so the text stack (rendered after the gradient, i.e. on top of
// it) sits on a clean surface instead of over busy pixels.
//
// Real store (useAllStores.ts -> GET /stores) — rating/avgPrepMinutes are
// only shown when the founder has actually set them (nullable on the real
// row); no distance row at all, stores has no geolocation yet so there's
// nothing real to show there.

import { Clock01Icon, Location01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import type { RealStore } from '../all-stores/useAllStores';

const CARD_SURFACE = '#F7F8F6';

interface Props {
  store: RealStore;
}

export function StoreCard({ store }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View
      className="h-48 overflow-hidden rounded-3xl shadow-lg shadow-black/10"
      style={{ backgroundColor: CARD_SURFACE }}
    >
      <Image source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* LinearGradient isn't one of NativeWind's auto-patched components —
          className is silently ignored, so positioning goes through style. */}
      <LinearGradient
        colors={['transparent', 'transparent', CARD_SURFACE]}
        locations={[0, 0.42, 0.62]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 justify-between py-4 pl-[46%] pr-4">
        <View>
          <Text className="text-lg font-extrabold leading-6 text-ink" numberOfLines={2}>
            {store.name}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <View className="rounded-full bg-white/70 px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-ink/70" numberOfLines={1}>
                {store.category}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className={`h-1.5 w-1.5 rounded-full ${store.isOpen ? 'bg-success' : 'bg-danger'}`} />
              <Text className={`text-xs font-semibold ${store.isOpen ? 'text-success' : 'text-danger'}`}>
                {store.isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          <View className="mt-2 flex-row items-center gap-3">
            {store.rating !== undefined && (
              <View className="flex-row items-center gap-1">
                <AppIcon icon={StarIcon} size={12} color={colors.gold} />
                <Text className="text-xs font-bold text-ink">{store.rating.toFixed(1)}</Text>
              </View>
            )}
            {store.avgPrepMinutes !== undefined && (
              <View className="flex-row items-center gap-1">
                <AppIcon icon={Clock01Icon} size={12} color={colors.limeDeep} />
                <Text className="text-xs font-semibold text-ink/70">~{store.avgPrepMinutes} min</Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          {store.district ? (
            <View className="flex-row items-center gap-1">
              <AppIcon icon={Location01Icon} size={13} color={colors.limeDeep} />
              <Text className="text-sm font-semibold text-ink/70" numberOfLines={1}>
                {store.district}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
            className="rounded-full bg-coral px-5 py-2.5 shadow-sm shadow-coral/40"
          >
            <Text className="text-xs font-extrabold text-white">Shop now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
