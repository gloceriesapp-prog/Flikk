// Single primary CTA style for the auth flow — solid ink, rounded-full,
// not customer app's coral. This app's own established CTA language
// throughout (Catalog/ProductDetail/StoreSettings "Save changes",
// OrderCard "Accept Order") is solid ink/black, never coral — coral is
// customer-app-only per specs/00-foundation/design-system.md ("CTA
// buttons only"), and this app has consistently not used it. Matching
// this app's own precedent here, not apps/customer/components/
// PrimaryButton.tsx's color choice.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from './AppIcon';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  // Optional trailing icon, e.g. a "›" chevron on a confirm step — every
  // existing caller omits this and keeps rendering text-only, unaffected.
  trailingIcon?: IconSvgElement;
}

export function PrimaryButton({ label, onPress, disabled, loading, trailingIcon }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`h-[52px] flex-row items-center justify-center gap-1.5 rounded-full ${isDisabled ? 'bg-ink/40' : 'bg-ink'}`}
      style={({ pressed }) => ({ opacity: pressed && !isDisabled ? 0.85 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text className="text-base font-medium text-white">{label}</Text>
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
