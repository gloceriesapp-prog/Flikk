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
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}
