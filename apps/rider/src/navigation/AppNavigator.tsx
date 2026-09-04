// Outer native-stack — just two entries: the whole tab shell (TabNavigator,
// with its own fixed BottomNavBar) and OrderDetail pushed on top with no
// tab bar. See types.ts's own note on why this replaced the earlier flat
// stack that rendered BottomNavBar per-screen.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
      <Stack.Screen name="Tabs" component={TabNavigator} />
      {/* gestureEnabled off — OrderDetailScreen's SlideToConfirmButton is a
          horizontal drag too, and it was fighting iOS's edge-swipe-back
          gesture (dragging the knob dragged the whole screen back along
          with it). Same fix apps/partner's own AppNavigator applies to its
          slide-to-confirm screen. Back navigation still works via
          OrderDetailScreen's own back-arrow button. */}
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ presentation: 'card', gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
