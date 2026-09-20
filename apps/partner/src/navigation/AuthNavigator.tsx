// Unauthenticated (or "authenticated but not yet a full store") stack:
// phone -> OTP -> 5-step onboarding wizard. Rendered by RootNavigator — see
// that file's own note on the three ways a session can be incomplete.
// `initialRouteName` lets RootNavigator drop a returning-but-store-less
// session straight onto OnboardingIntro instead of replaying Login.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BusinessDocumentsScreen } from '../screens/onboarding/BusinessDocumentsScreen';
import { LocationPinScreen } from '../screens/onboarding/LocationPinScreen';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { OnboardingIntroScreen } from '../screens/onboarding/OnboardingIntroScreen';
import { OtpVerificationScreen } from '../screens/onboarding/OtpVerificationScreen';
import { OwnerDetailsScreen } from '../screens/onboarding/OwnerDetailsScreen';
import { StoreDetailsScreen } from '../screens/onboarding/StoreDetailsScreen';
import { StoreHoursScreen } from '../screens/onboarding/StoreHoursScreen';
import { StoreLocationScreen } from '../screens/onboarding/StoreLocationScreen';
import { StoreReviewScreen } from '../screens/onboarding/StoreReviewScreen';
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
      <Stack.Screen name="OnboardingIntro" component={OnboardingIntroScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="StoreDetails" component={StoreDetailsScreen} />
      <Stack.Screen name="StoreLocation" component={StoreLocationScreen} />
      <Stack.Screen name="OwnerDetails" component={OwnerDetailsScreen} />
      <Stack.Screen name="BusinessDocuments" component={BusinessDocumentsScreen} />
      <Stack.Screen name="StoreHours" component={StoreHoursScreen} />
      <Stack.Screen name="StoreReview" component={StoreReviewScreen} />
      <Stack.Screen name="LocationPin" component={LocationPinScreen} options={{ presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
  );
}
