// Single primary CTA style for this app's own screens — solid ink,
// rounded-full, not customer app's coral. This app's own established CTA
// language throughout (Catalog/ProductDetail/StoreSettings "Save
// changes", OrderCard "Accept Order") is solid ink/black, never coral —
// coral is customer-app-only per specs/00-foundation/design-system.md
// ("CTA buttons only"), and this app has consistently not used it.
//
// variant="blue" is an explicit, narrow exception — the login/OTP screens
// (LoginScreen.tsx/OtpVerificationScreen.tsx) were redesigned to match
// apps/customer's own login flow pixel-for-pixel, including its
// CartBar.tsx-style blue (#2457F5), per an explicit ask to keep that one
// flow visually identical across both apps. Every other caller keeps
// rendering the default ink variant, untouched.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from './AppIcon';

const BLUE = '#2457F5';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  // Optional trailing icon, e.g. a "›" chevron on a confirm step — every
  // existing caller omits this and keeps rendering text-only, unaffected.
  trailingIcon?: IconSvgElement;
  variant?: 'ink' | 'blue';
}

export function PrimaryButton({ label, onPress, disabled, loading, trailingIcon, variant = 'ink' }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-[52px] flex-row items-center justify-center gap-1.5 rounded-full ${
        variant === 'ink' ? (isDisabled ? 'bg-ink/40' : 'bg-black') : ''
      }`}
      style={({ pressed }) => [
        variant === 'blue' ? { backgroundColor: isDisabled ? `${BLUE}66` : BLUE } : undefined,
        { opacity: pressed && !isDisabled ? 0.85 : 1 },
      ]}
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
