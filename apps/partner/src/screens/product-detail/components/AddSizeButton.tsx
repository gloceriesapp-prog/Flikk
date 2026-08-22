// "Add a size" affordance + its expanding chip grid — the picker itself
// (never free text, see ProductDetailScreen's file header note). Full-width
// dashed button, chip grid fans out below it in place, no nested sheet.

import { Pressable, Text, View } from 'react-native';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  availableSizes: string[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onPickSize: (label: string) => void;
}

export function AddSizeButton({ availableSizes, isOpen, onToggleOpen, onPickSize }: Props) {
  if (availableSizes.length === 0) return null;

  return (
    <View className="gap-2.5">
      <Pressable
        onPress={onToggleOpen}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/20 py-3.5"
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <AppIcon icon={Add01Icon} size={15} color={colors.ink} />
        <Text className="text-base font-medium tracking-tight text-ink">Add a size</Text>
      </Pressable>

      {isOpen && (
        <View className="flex-row flex-wrap gap-2 rounded-3xl bg-[#F9FAFB] p-3">
          {availableSizes.map((label) => (
            <Pressable
              key={label}
              onPress={() => onPickSize(label)}
              className="rounded-full border border-black/10 bg-white px-4 py-2"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text className="text-base font-medium tracking-tight text-ink">{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
