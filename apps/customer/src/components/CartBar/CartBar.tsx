import { ArrowRight01Icon, ArrowUp01Icon, ShoppingCart01Icon } from '@hugeicons/core-free-icons';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppImage } from '../AppImage';
import { AppIcon } from '../AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { getCartPreviewIds, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';
import { useQueryClient } from '@tanstack/react-query';
import { fetchAddresses } from '../../api/addresses';
import { useAuthStore } from '../../store/useAuthStore';

// Shared by every BottomNavBar. The last three additions appear left to right;
// quantity counts units across all stores, rather than product rows. The
// whole bar is one tap target to the cart.
// iOS: compact blue pill. Android: full-width white bar with stacked photos,
// the unit count and a blue View Cart button.
interface Props {
  // Native modals must be closed when opening a screen beneath them.
  onBeforeNavigate?: () => void;
}

const ANDROID_SHADOW = { shadowColor: '#101C10', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 };

export function CartBar({ onBeforeNavigate }: Props) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const items = useCartStore((state) => state.items);
  const lastAddedItemId = useCartStore((state) => state.lastAddedItemId);
  const recentItemIds = useCartStore((state) => state.recentItemIds);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const queryClient = useQueryClient();

  if (totalQuantity === 0) return null;

  // Preserve the last-added fallback for carts saved before avatar history.
  const previewIds = getCartPreviewIds(items, recentItemIds, recentItemIds.length === 0 ? lastAddedItemId ?? undefined : undefined);
  const productsById = new Map(items.map((item) => [item.id, item]));
  const previews = previewIds.flatMap((id) => {
    const item = productsById.get(id);
    return item ? [item] : [];
  });
  const quantityLabel = `${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`;
  const openCart = () => {
    onBeforeNavigate?.();
    // Start the address fetch during the screen transition; checkout's
    // quote waits on it (same key and fetcher as CartScreen).
    const { accessToken, customerId } = useAuthStore.getState();
    if (accessToken) void queryClient.prefetchQuery({ queryKey: ['addresses', customerId], queryFn: fetchAddresses });
    navigation.navigate('Cart');
  };

  if (Platform.OS !== 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${quantityLabel}`}
        onPress={openCart}
        style={{ width: Math.min(width - 64, 200), maxWidth: '100%' }}
        className="min-h-[52px] flex-row items-center gap-1.5 rounded-[16px] bg-primary px-2.5 py-2 active:opacity-90"
      >
        <View className="h-9 flex-row items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {previews.map((item, index) => (
            <View key={item.id} className="h-9 w-9 overflow-hidden rounded-lg bg-white" style={{ marginLeft: index === 0 ? 0 : -12, zIndex: index + 1 }}>
              <AppImage
                recyclingKey={item.id}
                source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }}
                style={{ width: '100%', height: '100%', transform: [{ scale: 1.2 }] }}
                resizeMode="contain"
                transition={0}
                accessible={false}
              />
            </View>
          ))}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-bold leading-[20px] text-white">Cart</Text>
          <Text numberOfLines={1} className="text-[12px] leading-[16px] text-white/80">{quantityLabel}</Text>
        </View>
        <View className="h-8 w-4 items-center justify-center">
          <AppIcon icon={ArrowRight01Icon} size={18} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View cart, ${quantityLabel}`}
      onPress={openCart}
      style={[{ width: '100%' }, ANDROID_SHADOW]}
      className="min-h-[62px] flex-row items-center gap-2.5 rounded-[18px] border border-[#ECEEF1] bg-white p-2 active:opacity-90"
    >
      <View className="h-12 flex-row items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {/* Oldest at the back, newest in front, each card peeking out. */}
        {previews.map((item, index) => (
          <View
            key={item.id}
            className="h-12 w-12 overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-white"
            style={{ marginLeft: index === 0 ? 0 : -34, zIndex: index + 1 }}
          >
            <AppImage
              recyclingKey={item.id}
              source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              transition={0}
              accessible={false}
            />
          </View>
        ))}
      </View>
      <View className="min-w-0 flex-1 flex-row items-center gap-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-ink/70">{quantityLabel}</Text>
        <AppIcon icon={ArrowUp01Icon} size={14} color="#155DFC" strokeWidth={2.5} />
      </View>
      <View className="h-12 flex-row items-center gap-1.5 rounded-[14px] bg-primary px-4">
        <Text numberOfLines={1} className="text-[15px] font-bold text-white">View Cart</Text>
        <AppIcon icon={ShoppingCart01Icon} size={17} color="#FFFFFF" strokeWidth={2} />
      </View>
    </Pressable>
  );
}
