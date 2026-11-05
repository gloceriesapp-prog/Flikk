// Pre-order products (Product.preorder): pick the delivery day and slot
// before adding. The choice is the whole cart's delivery (store/preorder.ts);
// the item goes in at its bulk minimum.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { bookingDates, cartPreorder, dayLabel, type CartPreorder } from '../../store/preorder';
import { usePreorders } from '../../screens/home/preorders/usePreorders';

interface Props {
  minQty: number;
  leadDays: number;
  value?: CartPreorder;
  onChange: (preorder: CartPreorder | undefined) => void;
}

const BLUE = '#2457F5';

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="items-center rounded-[12px] border px-3.5 py-2.5"
      style={{ borderColor: selected ? BLUE : '#DADADA', backgroundColor: selected ? '#F3F6FF' : '#FFFFFF' }}
    >
      <Text className="text-[13px] font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

export function ProductPreorderOptions({ minQty, leadDays, value, onChange }: Props) {
  const slots = usePreorders().data?.slots ?? [];
  const dates = bookingDates(leadDays);
  // A cart day this product can't make (more notice needed) isn't kept.
  const [day, setDay] = useState(value && dates.includes(value.date) ? value.date : undefined);
  const slotId = day && value?.date === day ? value.slotId : undefined;
  const choose = (nextDay: string, nextSlotId: string | undefined) => {
    setDay(nextDay);
    const slot = slots.find((s) => s.id === nextSlotId);
    onChange(slot ? cartPreorder(nextDay, slot) : undefined);
  };
  return (
    <View className="gap-3">
      <View className="rounded-[12px] bg-[#F3F6FF] px-3 py-2.5">
        <Text className="text-[13px] font-semibold text-ink">Pre-order · minimum {minQty}</Text>
        <Text className="mt-0.5 text-[12px] text-ink/60">
          The shop confirms your order and delivers it in the slot you pick{leadDays > 1 ? ` (${leadDays} days' notice)` : ''}.
        </Text>
      </View>
      <Text className="text-[13px] font-semibold text-ink/60">Delivery day</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {dates.map((d) => <Chip key={d} label={dayLabel(d)} selected={d === day} onPress={() => choose(d, value?.slotId)} />)}
      </ScrollView>
      <Text className="text-[13px] font-semibold text-ink/60">Time slot</Text>
      <View className="flex-row flex-wrap gap-2">
        {slots.map((slot) => (
          <Chip key={slot.id} label={slot.label} selected={slot.id === slotId} onPress={() => choose(day ?? dates[0]!, slot.id)} />
        ))}
      </View>
    </View>
  );
}
