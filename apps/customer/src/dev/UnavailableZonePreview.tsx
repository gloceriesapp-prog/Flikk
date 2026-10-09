// Local design preview of the "not deliverable here" screen.
//
// While PREVIEW_UNAVAILABLE_ZONE is on, the app opens straight onto
// UnavailableZoneScreen at the root, before login and location, so it can be
// edited in Expo Go with fast refresh. Rendered from App.tsx above every
// gate (fonts aside), so login, location, hydration and ReleaseGate never
// hide it. Development builds only (__DEV__):
// release builds always skip it. Set FORCE_PREVIEW to false (or remove this
// file's use in RootNavigator) before the UI is merged.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { UnavailableZoneScreen } from '../screens/home/unavailable-zone/UnavailableZoneScreen';
import { SelectLocationScreen } from '../screens/location/SelectLocationScreen';
import type { AppStackParamList } from '../navigation/types';

const FORCE_PREVIEW = true;

export const PREVIEW_UNAVAILABLE_ZONE =
  __DEV__ && (FORCE_PREVIEW || process.env.EXPO_PUBLIC_PREVIEW_UNAVAILABLE_ZONE === 'true');

if (PREVIEW_UNAVAILABLE_ZONE) {
  // Shows in the Expo terminal, so it's obvious which code the phone runs.
  console.log('[preview] Unavailable-zone preview is ON (src/dev/UnavailableZonePreview.tsx)');
}

const Stack = createNativeStackNavigator<AppStackParamList>();

export function UnavailableZonePreview() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={UnavailableZoneScreen} />
        <Stack.Screen name="SelectLocation" component={SelectLocationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
