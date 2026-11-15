// Custom bottom navigation: Home queue, Orders history, Inventory and Payouts.
// Tab routes switch without sliding their independently rendered navigation bars.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddProductScreen } from '../screens/catalog/AddProductScreen';
import { CatalogScreen } from '../screens/catalog/CatalogScreen';
import { DeleteAccountScreen } from '../screens/store-settings/DeleteAccountScreen';
import { LocationPinScreen } from '../screens/onboarding/LocationPinScreen';
import { OrderDetailScreen } from '../screens/order-detail/OrderDetailScreen';
import { OrderHistoryScreen } from '../screens/orders/OrderHistoryScreen';
import { ReviewsScreen } from '../screens/management/ReviewsScreen';
import { StaffScreen } from '../screens/management/StaffScreen';
import { DocumentReplacementScreen } from '../screens/management/DocumentReplacementScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { PayoutOrderHistoryScreen } from '../screens/payout-detail/PayoutOrderHistoryScreen';
import { PayoutsScreen } from '../screens/payouts/PayoutsScreen';
import { ProductDetailScreen } from '../screens/product-detail/ProductDetailScreen';
import { StoreSettingsScreen } from '../screens/store-settings/StoreSettingsScreen';
import { SupportScreen } from '../screens/support/SupportScreen';
import { SupportTicketScreen } from '../screens/support/SupportTicketScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Orders">
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Reviews" component={ReviewsScreen} />
      <Stack.Screen name="Staff" component={StaffScreen} />
      <Stack.Screen name="DocumentReplacement" component={DocumentReplacementScreen} />
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
      <Stack.Screen name="Support" component={SupportScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="SupportTicket" component={SupportTicketScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ presentation: 'card' }} />
      {/* Same real map-pin screen onboarding's own AuthNavigator already
          registers — StoreSettingsScreen's "Change on map" is the one
          post-approval way to reach it, updating the store's real
          lat/lng/address_line instead of only ever being set once at
          signup. */}
      <Stack.Screen name="LocationPin" component={LocationPinScreen} options={{ presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
  );
}
