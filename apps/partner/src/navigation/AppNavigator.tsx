// Bottom-tab structure per specs/02-partner-app/screens.md: Orders /
// Catalog / Payouts. No auth gate yet — see App.tsx. Orders is the
// initial route since the order queue (P2) is this app's home screen,
// not a separate tab.
//
// Native-stack, not @react-navigation/bottom-tabs — BottomNavBar is a
// custom floating glass pill rendered as a sibling of each screen's own
// ScrollView (same architecture as apps/customer), not the library's
// built-in tab bar UI. Since each of the three tab screens mounts its OWN
// BottomNavBar instance rather than sharing one persistent bar, native-
// stack's default push/slide transition between them visibly slid the
// bar itself along with the screen content — reading as "the navbar is
// reloading/moving" on every tab switch, not staying fixed the way a
// real tab bar would. `animation: 'none'` on these three screens only
// (same fix apps/customer's own AppNavigator.tsx already applies to its
// four bottom-tab screens) makes the switch instant with no slide, so
// only the content underneath actually changes and the bar reads as
// fixed in place.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddProductScreen } from '../screens/catalog/AddProductScreen';
import { CatalogScreen } from '../screens/catalog/CatalogScreen';
import { OrderDetailScreen } from '../screens/order-detail/OrderDetailScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { PayoutOrderHistoryScreen } from '../screens/payout-detail/PayoutOrderHistoryScreen';
import { PayoutsScreen } from '../screens/payouts/PayoutsScreen';
import { ProductDetailScreen } from '../screens/product-detail/ProductDetailScreen';
import { StoreSettingsScreen } from '../screens/store-settings/StoreSettingsScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Orders">
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Catalog" component={CatalogScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Payouts" component={PayoutsScreen} options={{ animation: 'none' }} />
      {/* gestureEnabled off — the slide-to-confirm knob on this screen is a
          horizontal drag too, and it was fighting iOS's edge-swipe-back
          gesture (dragging the knob dragged the whole screen back instead). */}
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ presentation: 'card', gestureEnabled: false }}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="PayoutOrderHistory" component={PayoutOrderHistoryScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="StoreSettings" component={StoreSettingsScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}
