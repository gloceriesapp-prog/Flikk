// AM/PM is editable for both opening and closing. Valid edits emit HH:mm;
// incomplete digits remain editable and are rejected before submission.
import { Pressable, Text, TextInput, View } from 'react-native';
import { storeHourDisplay, storeHourFromDigits } from '../../../utils/storeHours';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  suffix: 'AM' | 'PM';
}

export function TimeDigitsInput({ value, onChangeText, suffix }: Props) {
  const display = storeHourDisplay(value, suffix);
  return (
    <View className="relative justify-center">
      <TextInput
        value={display.text}
        onChangeText={raw => onChangeText(storeHourFromDigits(raw, display.period))}
        keyboardType="number-pad"
        placeholder="9:00"
        placeholderTextColor="#9AA5A3"
        accessibilityLabel="Store time in Indian Standard Time"
        className="rounded-2xl border border-black/10 bg-white py-3 pl-4 pr-16 text-[14px] font-medium text-ink"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change ${display.period} to ${display.period === 'AM' ? 'PM' : 'AM'}`}
        onPress={() => onChangeText(storeHourFromDigits(display.text, display.period === 'AM' ? 'PM' : 'AM'))}
        className="absolute bottom-0 right-1 top-0 items-center justify-center px-3"
      >
        <Text className="text-[13px] font-semibold text-primary">{display.period}</Text>
      </Pressable>
    </View>
  );
}
