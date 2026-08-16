// Authenticated stack. Bottom-tab structure (Home/Orders/Profile per
// specs/01-customer-app/README.md) lands when those screens are built.
//
// Entry point depends on whether a delivery location is already saved
// (useLocationStore, hydrated by RootNavigator before this ever mounts):
// no location -> LocationPermission flow first; location already set ->
// straight to Home. This is what stops a returning user from being asked
// for their location on every single app open.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { LocationPermissionScreen } from '../screens/location/LocationPermissionScreen';
import { LocationSearchScreen } from '../screens/location/LocationSearchScreen';
import { MapConfirmScreen } from '../screens/location/MapConfirmScreen';
import { useLocationStore } from '../store/useLocationStore';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const hasLocation = useLocationStore((s) => s.location !== null);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasLocation ? 'Home' : 'LocationPermission'}
    >
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
      <Stack.Screen name="MapConfirm" component={MapConfirmScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
    </Stack.Navigator>
  );
}
