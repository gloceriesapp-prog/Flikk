// Bottom-tab structure per specs/02-partner-app/screens.md: Orders /
// Catalog / Payouts. No auth gate yet — see App.tsx. Orders is the
// initial route since the order queue (P2) is this app's home screen,
// not a separate tab.
//
// Native-stack, not @react-navigation/bottom-tabs — BottomNavBar is a
// custom floating glass pill rendered as a sibling of each screen's own
// ScrollView (same architecture as apps/customer), not the library's
// built-in tab bar UI.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CatalogScreen } from '../screens/catalog/CatalogScreen';
import { OrderDetailScreen } from '../screens/order-detail/OrderDetailScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { PayoutsScreen } from '../screens/payouts/PayoutsScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Orders">
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Catalog" component={CatalogScreen} />
      <Stack.Screen name="Payouts" component={PayoutsScreen} />
      {/* gestureEnabled off — the slide-to-confirm knob on this screen is a
          horizontal drag too, and it was fighting iOS's edge-swipe-back
          gesture (dragging the knob dragged the whole screen back instead). */}
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ presentation: 'card', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
