// The card that actually differentiates Flikk from Instamart/Blinkit/
// BigBasket — all three run on warehouses/dark stores; Flikk is a
// coordination layer on top of real kirana/pharmacy shops that already
// exist in the neighbourhood (CLAUDE.md's own "what this is"). One real
// store photo (useFeaturedStore.ts -> GET /stores, same hook
// StoreListScreen's own FeaturedStoreBanner uses), full-bleed across the
// whole card — the header and "View store" button sit on top of it as
// overlays (a top/bottom gradient scrim keeps them legible regardless of
// how bright the photo is), not squeezed into a flex row above/below a
// smaller inset photo. Leads the row, before the generic list cards,
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
import { useFeaturedStore } from '../../../store-list/top-stores/useFeaturedStore';
import type { AppStackParamList } from '../../../../navigation/types';

const CARD_RADIUS = 28;

export function LocalShopCard() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: store } = useFeaturedStore();

  if (!store) return null;

  return (
    <View style={{ width: 288, height: 300, borderRadius: CARD_RADIUS, overflow: 'hidden' }} className="shadow-lg shadow-black/15">
      <Image source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }} className="absolute inset-0 h-full w-full" resizeMode="cover" />

      {/* Top scrim for the header, bottom scrim for the button — both
          transparent in the middle so the photo itself stays uncovered. */}
      <LinearGradient colors={['rgba(16,28,16,0.45)', 'transparent']} className="absolute inset-x-0 top-0 h-20" />
      <LinearGradient colors={['transparent', 'rgba(16,28,16,0.55)']} className="absolute inset-x-0 bottom-0 h-24" />

      <View className="flex-1 justify-between px-5 py-5">
        <View className="flex-row items-center gap-1.5 self-start">
          <AppIcon icon={Store01Icon} size={16} color="#FFFFFF" strokeWidth={2} />
          <Text className="text-[15px] font-bold text-white">Stores Near You</Text>
        </View>

        <Pressable
          onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
          className="items-center self-center rounded-full bg-white px-6 py-3 shadow-md shadow-black/15"
        >
          <Text className="text-sm font-semibold text-ink">View store</Text>
        </Pressable>
      </View>
    </View>
  );
}
