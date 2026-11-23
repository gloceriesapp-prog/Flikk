import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

export function AddSizeButton({ availableSizes, onPickSize }: {
  availableSizes: string[];
  onPickSize: (label: string) => void;
}) {
  const [showPresets, setShowPresets] = useState(false);

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        onPress={() => onPickSize('g')}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/20 py-3.5"
      >
        <AppIcon icon={Add01Icon} size={15} color={colors.ink} />
        <Text className="text-base font-medium text-ink">Add size</Text>
      </Pressable>
      {availableSizes.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showPresets }}
          onPress={() => setShowPresets((current) => !current)}
          className="self-start py-2"
        >
          <Text className="text-sm font-medium text-ink">{showPresets ? 'Hide common sizes' : 'Show common sizes'}</Text>
        </Pressable>
      )}
      {showPresets && availableSizes.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {availableSizes.map((label) => (
            <Pressable key={label} accessibilityRole="button"
              onPress={() => { onPickSize(label); setShowPresets(false); }}
              className="rounded-full border border-black/10 bg-white px-4 py-2">
              <Text className="text-sm font-medium text-ink">{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
