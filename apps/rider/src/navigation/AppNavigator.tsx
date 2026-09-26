// Outer native-stack — just two entries: the whole tab shell (TabNavigator,
// with its own fixed BottomNavBar) and OrderDetail pushed on top with no
// tab bar. See types.ts's own note on why this replaced the earlier flat
// stack that rendered BottomNavBar per-screen.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import { PickupNavigationScreen } from '../screens/orders/PickupNavigationScreen';
import { PickupVerificationScreen } from '../screens/orders/PickupVerificationScreen';
import { DeliveryNavigationScreen } from '../screens/orders/DeliveryNavigationScreen';
import { DeliveryProofScreen } from '../screens/orders/DeliveryProofScreen';
import { DeliveryCompleteScreen } from '../screens/orders/DeliveryCompleteScreen';
import { RiderDocumentsScreen } from '../screens/profile/RiderDocumentsScreen';
import { PayoutHistoryScreen } from '../screens/payouts/PayoutHistoryScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={TabNavigator} />
      {/* gestureEnabled off on every slide-to-confirm screen — the knob is a
          horizontal drag that fights iOS's edge-swipe-back (dragging the knob
          dragged the whole screen back with it). PickupNavigation ("slide
          when you arrive"), PickupVerification ("slide to verify & pick up"),
          DeliveryNavigation and OrderDetail all carry a slide button, so back
          navigation on each is its own back-arrow button only, never the
          swipe. Same fix apps/partner's AppNavigator applies to its own. */}
      <Stack.Screen name="PickupNavigation" component={PickupNavigationScreen} options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="DeliveryNavigation" component={DeliveryNavigationScreen} options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="DeliveryProof" component={DeliveryProofScreen} options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="DeliveryComplete" component={DeliveryCompleteScreen} options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="RiderDocuments" component={RiderDocumentsScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="PayoutHistory" component={PayoutHistoryScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}
