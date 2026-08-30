// Home/Work/Other pills — picking "Other" reveals a free-text "Name this
// address" field instead of a permanently-visible one (same reveal-only-
// when-needed pattern apps/partner's own StoreCategoryPicker uses for its
// "Others" option) — Home and Work never need a custom name, only the
// genuine edge case does.

import { Briefcase01Icon, Home01Icon, Location04Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const PRESETS = [
  { value: 'Home', icon: Home01Icon },
  { value: 'Work', icon: Briefcase01Icon },
  { value: 'Other', icon: Location04Icon },
] as const;

interface Props {
  label: string;
  customName: string;
  onSelectPreset: (value: string) => void;
  onChangeCustomName: (value: string) => void;
}

export function AddressTypePicker({ label, customName, onSelectPreset, onChangeCustomName }: Props) {
  const isOther = label === 'Other';

  return (
    <View className="gap-2.5">
      <View className="flex-row overflow-hidden rounded-2xl bg-gray-100 p-1">
        {PRESETS.map((preset) => {
          const isActive = preset.value === label;
          return (
            <Pressable
              key={preset.value}
              onPress={() => onSelectPreset(preset.value)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${isActive ? 'bg-ink' : ''}`}
            >
              <AppIcon icon={preset.icon} size={14} color={isActive ? '#FFFFFF' : colors.ink} />
              <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-ink/70'}`}>{preset.value}</Text>
            </Pressable>
          );
        })}
      </View>

      {isOther && (
        <TextInput
          value={customName}
          onChangeText={onChangeCustomName}
          placeholder="Name this address — e.g. Friend's place"
          placeholderTextColor="#9AA5A3"
          className="rounded-2xl border border-gray-200 px-4 py-3.5 text-base text-ink"
        />
      )}
    </View>
  );
}
