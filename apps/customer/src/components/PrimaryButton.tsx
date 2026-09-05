// Single primary CTA style used across the auth flow. Per
// specs/00-foundation/design-system.md: coral is the CTA color, not lime —
// lime is reserved for brand/nav/active-state, so it never has to double as
// both "this is the brand" and "tap this." Don't swap this back to lime.
//
// variant="blue" is an explicit per-screen opt-in (LoginScreen.tsx's own
// redesign asked for the same blue this app already uses elsewhere —
// CartBar.tsx/ProductDetailFooter.tsx's #2457F5), not a change to the
// shared default — Onboarding/OTP/LocationPermission all still render the
// default coral, untouched.

import { ActivityIndicator, Pressable, Text } from 'react-native';

const BLUE = '#2457F5';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'coral' | 'blue';
}

export function PrimaryButton({ label, onPress, disabled, loading, variant = 'coral' }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-[52px] items-center justify-center rounded-button active:opacity-90 ${
        variant === 'coral' ? (isDisabled ? 'bg-coral/40' : 'bg-coral') : ''
      }`}
      style={variant === 'blue' ? { backgroundColor: isDisabled ? `${BLUE}66` : BLUE } : undefined}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
