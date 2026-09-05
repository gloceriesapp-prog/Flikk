// Unauthenticated stack: brand entry -> phone -> OTP. Rendered by RootNavigator
// only while there's no session token.
//
// initialRouteName is dynamic (useAuthStore's own hasSeenOnboarding), same
// pattern AppNavigator.tsx already uses for its own hasLocation check —
// Onboarding only on a genuinely fresh app open; every later remount of
// this navigator (e.g. ProfileScreen.tsx's own guest-exit redirect) skips
// straight to Login instead of re-showing a splash screen already
// dismissed once this session.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={hasSeenOnboarding ? 'Login' : 'Onboarding'}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
