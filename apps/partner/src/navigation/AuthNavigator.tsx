// Unauthenticated (or "authenticated but not yet a full store") stack:
// phone -> OTP -> Store Setup. Rendered by RootNavigator — see that
// file's own note on the three ways a session can be incomplete. Welcome
// is no longer part of this stack (RootNavigator's own fixed-duration
// splash gate, before either stack mounts — this file's own header note
// used to have a brand-entry screen here; removed per an explicit ask to
// drop the tappable "Get Started" step entirely). `initialRouteName` lets
// RootNavigator drop a returning-but-store-less session straight onto
// Store Setup instead of replaying Login.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LocationPinScreen } from '../screens/onboarding/LocationPinScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { OtpVerificationScreen } from '../screens/onboarding/OtpVerificationScreen';
import { StoreDetailsScreen } from '../screens/onboarding/StoreDetailsScreen';
import { StoreReviewScreen } from '../screens/onboarding/StoreReviewScreen';
import { StoreSetupScreen } from '../screens/onboarding/StoreSetupScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface Props {
  initialRouteName?: keyof AuthStackParamList;
}

export function AuthNavigator({ initialRouteName = 'Login' }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="StoreSetup" component={StoreSetupScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="StoreDetails" component={StoreDetailsScreen} />
      <Stack.Screen name="StoreReview" component={StoreReviewScreen} />
      <Stack.Screen name="LocationPin" component={LocationPinScreen} options={{ presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
  );
}
