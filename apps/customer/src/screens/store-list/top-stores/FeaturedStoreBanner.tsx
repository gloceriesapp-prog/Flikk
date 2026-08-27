// Replaces the old avatar-row TopStoresSection with a single hero promo
// card for today's featured store — reference: a gradient-fill card, bold
// title/subtitle stacked top-left, a pill CTA bottom-left, and a
// transparent-background product photo bleeding past the card's own
// rounded edge on the right. Reworked for Flikk: lime-deep -> ink diagonal
// (the same "header gradients" use lime-deep already has, per design-
// system.md) instead of the reference's red, store name + hours instead of
// a generic tagline, "SHOP NOW" instead of "LEARN MORE".
//
// The photo is a real Storage asset (store-images bucket, transparent PNG —
// no card of its own, "add image which is there without bg image" per the
// ask), not clipped by the card's rounded corners: the gradient card is its
// own overflow-hidden layer, the photo is a sibling positioned on top of
// it, free to spill past that edge — same "breaks the frame" trick the
// reference uses.
//
// Real store data (useFeaturedStore.ts -> GET /stores) — name and open/
// close hours, same store row a founder fills in on admin's Add Store form.
// Renders nothing while there's no store yet.

import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useFeaturedStore } from './useFeaturedStore';
import type { AppStackParamList } from '../../../navigation/types';

const FEATURED_PRODUCT_IMAGE_URI =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/store-images/unnamed-removebg-preview.png';

export function FeaturedStoreBanner() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: store } = useFeaturedStore();

  if (!store) return null;

  const hours = store.openTime && store.closeTime ? `Open ${store.openTime} – ${store.closeTime}` : undefined;

  return (
    <View className="px-5 pt-6">
      <View className="relative">
        <View className="overflow-hidden rounded-3xl shadow-lg shadow-black/20">
          <LinearGradient
            colors={[colors.limeDeep, colors.ink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: 24, paddingBottom: 24, paddingLeft: 20, paddingRight: 140, minHeight: 168 }}
          >
            <Text className="text-2xl font-extrabold leading-8 text-white" numberOfLines={1}>
              {store.name}
            </Text>
            {hours && <Text className="mt-1 text-sm font-medium text-white/70">{hours}</Text>}

            <Pressable
              onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
              className="mt-6 flex-row items-center gap-2 self-start rounded-full bg-white px-4 py-2.5"
            >
              <View className="h-6 w-6 items-center justify-center rounded-full bg-lime-soft">
                <AppIcon icon={ArrowUpRight01Icon} size={13} color={colors.limeDeep} strokeWidth={2.2} />
              </View>
              <Text className="text-xs font-extrabold tracking-wide text-ink">SHOP NOW</Text>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Sibling, not a child of the clipped card above — free to spill
            past its rounded edge, same trick the reference uses. */}
        <Image
          source={{ uri: FEATURED_PRODUCT_IMAGE_URI }}
          resizeMode="contain"
          style={{ position: 'absolute', right: -12, bottom: -14, width: 168, height: 168 }}
        />
      </View>
    </View>
  );
}
