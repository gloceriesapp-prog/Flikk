// Full-bleed background photo, not a boxed thumbnail — sharpest on the
// left, fading via LinearGradient into the card's own #F7F8F6 tone toward
// the right so the text stack (rendered after the gradient, i.e. on top of
// it) sits on a clean surface instead of over busy pixels.

import { Clock01Icon, Location01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { getStoreImageUri } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import type { StoreListing } from '../data';

const CARD_SURFACE = '#F7F8F6';

interface Props {
  store: StoreListing;
}

export function StoreCard({ store }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View
      className="h-44 overflow-hidden rounded-3xl border border-gray-100"
      style={{ backgroundColor: CARD_SURFACE }}
    >
      <Image source={{ uri: getStoreImageUri(store.id) }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* LinearGradient isn't one of NativeWind's auto-patched components —
          className is silently ignored, so positioning goes through style. */}
      <LinearGradient
        colors={['transparent', CARD_SURFACE, CARD_SURFACE]}
        locations={[0.3, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-1 justify-between py-4 pl-[46%] pr-4">
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

          <Text className="mt-1.5 text-xs italic leading-4 text-ink/45" numberOfLines={2}>
            {store.ownerNote}
          </Text>

          <View className="mt-2 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <AppIcon icon={StarIcon} size={12} color={colors.gold} />
              <Text className="text-xs font-bold text-ink">{store.rating.toFixed(1)}</Text>
              <Text className="text-xs text-ink/45">({store.ratingCount})</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <AppIcon icon={Clock01Icon} size={12} color={colors.limeDeep} />
              <Text className="text-xs font-semibold text-ink/70">~{store.etaMinutes} min</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1">
            <AppIcon icon={Location01Icon} size={13} color={colors.limeDeep} />
            <Text className="text-sm font-semibold text-ink/70">{store.distanceKm} km away</Text>
          </View>
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
