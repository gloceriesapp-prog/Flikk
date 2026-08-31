// Unauthenticated stack: brand entry -> phone -> OTP. Rendered by
// RootNavigator whenever there's no session.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/onboarding/LoginScreen';
import { OtpVerificationScreen } from '../screens/onboarding/OtpVerificationScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
