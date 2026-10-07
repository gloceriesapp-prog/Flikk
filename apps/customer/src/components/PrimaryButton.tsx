// Single primary CTA. Coral is the ONLY CTA color (CLAUDE.md design system) —
// lime is brand/active-state, blue is off-brand. Ink text, not white: white
// on coral is ~2.8:1 and fails AA at this size; ink on coral is ~7:1.
//
// `variant` is kept only so existing call sites (variant="blue") compile;
// every variant renders coral.

import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** @deprecated every variant renders the coral CTA. */
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
      className={`h-[52px] items-center justify-center rounded-button active:opacity-90 ${isDisabled ? 'bg-coral/40' : 'bg-coral'}`}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text className="text-[15px] font-semibold text-ink">{label}</Text>
      )}
    </Pressable>
  );
}
