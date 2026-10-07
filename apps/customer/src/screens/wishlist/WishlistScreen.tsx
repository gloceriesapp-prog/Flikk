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
import { useCopy } from '../../api/appConfig';
import { productAvailability } from '../../utils/productAvailability';

type Props = NativeStackScreenProps<AppStackParamList, 'Wishlist'>;

const CARD_WIDTH = 'w-full';
const NUM_COLUMNS = 3;

export function WishlistScreen({ navigation }: Props) {
  const saved = useWishlistStore((state) => state.items);
  const title = useCopy('wishlist.title');
  const emptyTitle = useCopy('wishlist.empty.title');
  const emptySubtitle = useCopy('wishlist.empty.subtitle');
  const unavailableNote = useCopy('wishlist.unavailable.note');
  // Out-of-stock items and closed/deactivated shops stay listed (the customer
  // saved them) but sort last; ProductCard itself shows the reason and
  // disables add-to-cart via the same productAvailability check.
  const available = saved.filter((p) => productAvailability(p).isAvailable);
  const items = available.length === saved.length ? saved : [...available, ...saved.filter((p) => !productAvailability(p).isAvailable)];
  const hasUnavailable = available.length < saved.length;

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center px-2 pb-2 pt-2">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-bold text-ink">{title}</Text>
        <View className="h-11 w-11" />
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon icon={HeartIcon} size={26} color={colors.ink} strokeWidth={1.6} />
          </View>
          <Text className="text-center text-base font-semibold text-ink">{emptyTitle}</Text>
          <Text className="text-center text-sm text-ink/50">
            {emptySubtitle}
          </Text>
        </View>
      ) : (
        <FlashList
          data={items}
          numColumns={NUM_COLUMNS}
          keyExtractor={(product: Product) => product.id}
          ListHeaderComponent={hasUnavailable ? <Text className="px-1 pb-3 text-[13px] text-ink/60">{unavailableNote}</Text> : null}
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
