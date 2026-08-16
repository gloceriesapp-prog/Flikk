// Single primary CTA style used across the auth flow. Per
// specs/00-foundation/design-system.md: coral is the CTA color, not lime —
// lime is reserved for brand/nav/active-state, so it never has to double as
// both "this is the brand" and "tap this." Don't swap this back to lime.

import { ActivityIndicator, Pressable, Text } from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-[52px] items-center justify-center rounded-button ${
        isDisabled ? 'bg-coral/40' : 'bg-coral active:opacity-90'
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-base font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
