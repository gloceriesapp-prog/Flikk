// "Myself" vs "Someone else" — drives whether AddressFormScreen shows the
// full name+phone form or just a compact "ordering for yourself" summary
// pulled from the account. Not decoration: picking "Myself" genuinely
// skips re-typing your own name/phone (fetchAccountInfo, api/auth.ts),
// picking "Someone else" clears both fields so a real name/number has to
// be typed in rather than silently reusing whatever was there before.

import { Pressable, Text, View } from 'react-native';

export type OrderingFor = 'myself' | 'someone_else';

const ACCENT = '#155DFC';

interface Props {
  value: OrderingFor;
  onChange: (value: OrderingFor) => void;
}

function RadioDot({ selected }: { selected: boolean }) {
  if (!selected) return <View className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  return (
    <View className="h-5 w-5 items-center justify-center rounded-full border-2" style={{ borderColor: ACCENT }}>
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />
    </View>
  );
}

export function OrderingForToggle({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-3">
      <Pressable
        onPress={() => onChange('myself')}
        className="flex-1 flex-row items-center gap-2.5 rounded-2xl border px-4 py-3.5"
        style={{ borderColor: value === 'myself' ? ACCENT : '#E5E7EB', backgroundColor: value === 'myself' ? `${ACCENT}0F` : '#FFFFFF' }}
      >
        <RadioDot selected={value === 'myself'} />
        <Text className="text-[15px] font-medium text-ink">Myself</Text>
      </Pressable>

      <Pressable
        onPress={() => onChange('someone_else')}
        className="flex-1 flex-row items-center gap-2.5 rounded-2xl border px-4 py-3.5"
        style={{
          borderColor: value === 'someone_else' ? ACCENT : '#E5E7EB',
          backgroundColor: value === 'someone_else' ? `${ACCENT}0F` : '#FFFFFF',
        }}
      >
        <RadioDot selected={value === 'someone_else'} />
        <Text className="text-[15px] font-medium text-ink" numberOfLines={1}>
          Someone else
        </Text>
      </Pressable>
    </View>
  );
}
