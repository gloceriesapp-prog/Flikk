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
