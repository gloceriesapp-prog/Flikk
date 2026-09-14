// Unauthenticated stack: phone -> OTP. Rendered by RootNavigator only
// while there's no session token — the brand moment (logo/name) now lives
// in WelcomeScreen (RootNavigator's own timed gate, shown on every cold
// open before this stack or AppNavigator ever mounts), so this stack
// starts straight at the real phone-entry screen instead of a separate
// "Get Started" splash first.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
