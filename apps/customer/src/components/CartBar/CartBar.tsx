import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { getCartPreviewIds, selectCartTotalPrice, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { fetchAddresses } from '../../api/addresses';
import { useDeliverySettings } from '../../api/deliverySettings';
import { useAuthStore } from '../../store/useAuthStore';
import type { AppStackParamList } from '../../navigation/types';
import { CartBarCard } from './CartBarCard';
import { BOTTOM_NAV_HORIZONTAL_INSET } from '../BottomNavBar/layout';

interface Props {
  // Close a native picker before navigating to the screen beneath it.
  onBeforeNavigate?: () => void;
}

/** One cart preview across browse pages and product pickers, on both platforms. */
export function CartBar({ onBeforeNavigate }: Props) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const items = useCartStore(state => state.items);
  const lastAddedItemId = useCartStore(state => state.lastAddedItemId);
  const recentItemIds = useCartStore(state => state.recentItemIds);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const itemTotal = useCartStore(selectCartTotalPrice);
  const queryClient = useQueryClient();
  const { data: settings } = useDeliverySettings();
  if (totalQuantity === 0) return null;

  const byId = new Map(items.map(item => [item.id, item]));
  const previews = getCartPreviewIds(items, recentItemIds, recentItemIds.length === 0 ? lastAddedItemId ?? undefined : undefined)
    .flatMap(id => byId.get(id) ? [byId.get(id)!] : []);
  const openCart = () => {
    onBeforeNavigate?.();
    const { accessToken, customerId } = useAuthStore.getState();
    if (accessToken) void queryClient.prefetchQuery({ queryKey: ['addresses', customerId], queryFn: fetchAddresses });
    navigation.navigate('Cart');
  };
  return <CartBarCard width={width - BOTTOM_NAV_HORIZONTAL_INSET * 2} quantity={totalQuantity} itemTotal={itemTotal}
    previews={previews} deliveryThreshold={settings?.freeDeliveryEnabled ? settings.freeDeliveryThreshold : undefined} onPress={openCart} />;
}
