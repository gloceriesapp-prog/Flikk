// Single primary CTA. Blue (`primary`, #155DFC) is the CTA color; lime stays
// brand/active-state. White text on it is ~5.2:1, which passes AA.
//
// `variant` is kept only so existing call sites compile; every variant
// renders the same blue button.

import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** @deprecated every variant renders the primary CTA. */
  variant?: 'coral' | 'blue';
}

export function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      className={`h-[52px] items-center justify-center rounded-button active:opacity-90 ${isDisabled ? 'bg-primary/40' : 'bg-primary'}`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-[15px] font-semibold text-white">{label}</Text>
      )}
    </Pressable>
  );
}
