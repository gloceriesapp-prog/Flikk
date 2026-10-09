import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppImage } from '../AppImage';
import { AppIcon } from '../AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { getCartPreviewIds, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import type { AppStackParamList } from '../../navigation/types';

// Shared by every BottomNavBar. The last three additions appear left to right;
// quantity counts units across all stores, rather than product rows.
interface Props {
  // Native modals must be closed when opening a screen beneath them.
  onBeforeNavigate?: () => void;
}

export function CartBar({ onBeforeNavigate }: Props) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const items = useCartStore((state) => state.items);
  const lastAddedItemId = useCartStore((state) => state.lastAddedItemId);
  const recentItemIds = useCartStore((state) => state.recentItemIds);
  const totalQuantity = useCartStore(selectCartTotalQuantity);

  if (totalQuantity === 0) return null;

  // Preserve the last-added fallback for carts saved before avatar history.
  const previewIds = getCartPreviewIds(items, recentItemIds, recentItemIds.length === 0 ? lastAddedItemId ?? undefined : undefined);
  const productsById = new Map(items.map((item) => [item.id, item]));
  const previews = previewIds.flatMap((id) => {
    const item = productsById.get(id);
    return item ? [item] : [];
  });
  const quantityLabel = `${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View cart, ${quantityLabel}`}
      onPress={() => {
        onBeforeNavigate?.();
        navigation.navigate('Cart');
      }}
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
