// The card that actually differentiates Flikk from Instamart/Blinkit/
// BigBasket — all three run on warehouses/dark stores; Flikk is a
// coordination layer on top of real kirana/pharmacy shops that already
// exist in the neighbourhood (CLAUDE.md's own "what this is"). Rather than
// another product-list card, this one is a full-bleed hero photo of a real
// store (useFeaturedStore.ts -> GET /stores, same hook StoreListScreen's
// own FeaturedStoreBanner uses — reused, not duplicated, react-query dedupes
// the call by its query key) with a "100% Local" badge and a direct link to
// that store's own page. Leads the row, before the generic list cards,
// since it's the one thing a scroll through Instamart/Blinkit doesn't have.
//
// Renders nothing while there's no store yet.

import { Store01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import { colors } from '../../../../theme/tokens';
import { useFeaturedStore } from '../../../store-list/top-stores/useFeaturedStore';
import type { AppStackParamList } from '../../../../navigation/types';

const CARD_RADIUS = 28;

export function LocalShopCard() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: store } = useFeaturedStore();

  if (!store) return null;

  return (
    <Pressable
      onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
      style={{ width: 288, height: 300, borderRadius: CARD_RADIUS, overflow: 'hidden' }}
      className="shadow-lg shadow-black/20"
    >
      <Image source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }} className="absolute inset-0 h-full w-full" resizeMode="cover" />

      {/* Bottom-heavy dark fade so white text stays legible regardless of
          how bright the store's own photo is — same convention as
          StoreHeader.tsx's own banner. */}
      <LinearGradient
        colors={['transparent', 'rgba(16,28,16,0.15)', 'rgba(16,28,16,0.92)']}
        locations={[0, 0.45, 1]}
        className="absolute inset-0"
      />

      <View className="flex-1 justify-between p-4">
        <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/95 px-3 py-1.5">
          <AppIcon icon={Store01Icon} size={13} color={colors.limeDeep} strokeWidth={2} />
          <Text className="text-[11px] font-extrabold tracking-wide text-ink">100% LOCAL</Text>
        </View>

        <View className="gap-1">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-lime">Real shop, not a warehouse</Text>
          <Text className="text-xl font-extrabold leading-6 text-white" numberOfLines={1}>
            {store.name}
          </Text>
          <Text className="text-xs font-medium text-white/70">Serving Kaup, Udupi</Text>

          <View className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-full bg-lime-deep py-2.5">
            <Text className="text-xs font-extrabold text-ink">Visit store</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
