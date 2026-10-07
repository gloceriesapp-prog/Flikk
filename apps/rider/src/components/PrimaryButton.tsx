// Single primary CTA style for this app — solid ink, rounded-full, same
// language partner app uses for its own auth flow (not customer's coral,
// which is that app's CTA-only color per design-system.md).

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from './AppIcon';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  trailingIcon?: IconSvgElement;
  // 'ink' (default) for the main app; 'blue' for the rider onboarding flow,
  // which uses one brand blue (#1447E6) across every Next/CTA.
  // 'coral' for money/save CTAs per CLAUDE.md (payout details).
  tone?: 'ink' | 'blue' | 'coral';
}

// Per-tone solid / disabled fills — one place so a tone is a single word
// at the call site, not a re-typed hex.
const TONE_BG: Record<'ink' | 'blue' | 'coral', { solid: string; disabled: string }> = {
  ink: { solid: 'bg-ink', disabled: 'bg-ink/40' },
  blue: { solid: 'bg-[#1447E6]', disabled: 'bg-[#1447E6]/40' },
  coral: { solid: 'bg-coral', disabled: 'bg-coral/40' },
};

export function PrimaryButton({ label, onPress, disabled, loading, trailingIcon, tone = 'ink' }: Props) {
  const isDisabled = disabled || loading;
  const bg = TONE_BG[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-[54px] flex-row items-center justify-center gap-1.5 rounded-full ${isDisabled ? bg.disabled : bg.solid}`}
      style={({ pressed }) => ({ opacity: pressed && !isDisabled ? 0.85 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text className="text-[15px] font-medium text-white">{label}</Text>
          {trailingIcon && (
            <View>
              <AppIcon icon={trailingIcon} size={16} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
