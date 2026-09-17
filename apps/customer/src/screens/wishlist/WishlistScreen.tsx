// Reached from HomeHeader's heart icon. Shows every product a customer has
// hearted (useWishlistStore, real account-backed sync via GET /wishlist —
// see that store's own note). Same 3-column ProductCard grid
// ProductSection.tsx already uses elsewhere, reused as-is rather than a new
// grid layout invented for this one screen.
//
// FlashList, not a ScrollView + flex-wrap — a wishlist can genuinely grow
// into a real long list over time (every product a customer has ever
// hearted, never auto-pruned), and a plain ScrollView renders every card
// up front regardless of how many are actually on screen. FlashList only
// mounts/measures what's near the viewport, which is what keeps scrolling
// smooth as the list grows instead of degrading linearly with item count.

import { ArrowLeft01Icon, HeartIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useWishlistStore } from '../../store/useWishlistStore';
import { ProductCard } from '../home/products/ProductCard';
import type { Product } from '../home/products/types';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Wishlist'>;

const CARD_WIDTH = 'w-full';
const NUM_COLUMNS = 3;

export function WishlistScreen({ navigation }: Props) {
  const items = useWishlistStore((state) => state.items);

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center px-2 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-bold text-ink">Wishlist</Text>
        <View className="h-11 w-11" />
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon icon={HeartIcon} size={26} color={colors.ink} strokeWidth={1.6} />
          </View>
          <Text className="text-center text-base font-semibold text-ink">Nothing here yet</Text>
          <Text className="text-center text-sm text-ink/50">
            Tap the heart on any product to save it here for later.
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          numColumns={NUM_COLUMNS}
          keyExtractor={(product: Product) => product.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
          renderItem={({ item }: { item: Product }) => (
            <View style={{ flex: 1, paddingHorizontal: 5, paddingBottom: 20 }}>
              <ProductCard product={item} widthClassName={CARD_WIDTH} />
            </View>
          )}
        />
      )}
    </View>
  );
}
