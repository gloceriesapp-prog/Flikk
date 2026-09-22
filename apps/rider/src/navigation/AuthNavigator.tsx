// Unauthenticated (or "authenticated but not yet an approved rider") stack:
// phone -> OTP -> 6-step onboarding wizard. Rendered by RootNavigator — see
// that file's own note on the states a session can be in. `initialRouteName`
// lets RootNavigator drop a returning applicant straight onto OnboardingIntro
// instead of replaying Login (React Navigation's initialRouteName only
// applies on a navigator's first mount, so RootNavigator keys this by the
// access token to force the remount — same trick apps/partner uses).

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { OtpVerificationScreen } from '../screens/onboarding/OtpVerificationScreen';
import { OnboardingIntroScreen } from '../screens/onboarding/OnboardingIntroScreen';
import { PersonalDetailsScreen } from '../screens/onboarding/PersonalDetailsScreen';
import { IdentityVerificationScreen } from '../screens/onboarding/IdentityVerificationScreen';
import { VehicleDetailsScreen } from '../screens/onboarding/VehicleDetailsScreen';
import { EmergencyContactScreen } from '../screens/onboarding/EmergencyContactScreen';
import { ReviewSubmitScreen } from '../screens/onboarding/ReviewSubmitScreen';
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
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
      <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
      <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} />
      <Stack.Screen name="ReviewSubmit" component={ReviewSubmitScreen} />
    </Stack.Navigator>
  );
}
