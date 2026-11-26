// Milk, bread, fish…: when the whole cart can go in a morning slot (the quote
// lists morningSlots, backend lib/preorders.ts), the customer picks quick
// delivery now or the next open morning slot from the same shop.
import { Pressable, Text, View } from 'react-native';
import type { CheckoutQuote } from '../../../api/checkout';
import { bookingDates, cartPreorder, slotOpen, type CartPreorder, type PreorderSlot } from '../../../store/preorder';

export function nextMorningSlot(slots: NonNullable<CheckoutQuote['morningSlots']>, now = new Date()): CartPreorder | null {
  for (const date of bookingDates(now)) {
    for (const raw of slots) {
      const slot: PreorderSlot = { id: raw.id, label: raw.label, startsMinute: raw.starts_minute, endsMinute: raw.ends_minute };
      if (slotOpen(date, slot, now)) return cartPreorder(date, slot, now);
    }
  }
  return null;
}

function Option({ title, subtitle, selected, onPress }: { title: string; subtitle: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
      className={`min-h-[56px] flex-1 justify-center rounded-xl border px-3 py-2 ${selected ? 'border-[#2457F5] bg-[#EEF3FF]' : 'border-gray-200 bg-white'}`}>
      <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>{title}</Text>
      <Text className="mt-0.5 text-[12px] font-medium text-ink/55" numberOfLines={1}>{subtitle}</Text>
    </Pressable>
  );
}

export function MorningSlotChooser({ morning, chosen, estimatedMinutes, onChoose }: {
  morning: CartPreorder; chosen: CartPreorder | null; estimatedMinutes: number; onChoose: (slot: CartPreorder | null) => void;
}) {
  return (
    <View className="mt-3 flex-row gap-2" accessibilityRole="radiogroup">
      <Option title="Now" subtitle={`In ${estimatedMinutes} mins`} selected={!chosen} onPress={() => onChoose(null)} />
      <Option title="Morning slot" subtitle={morning.label} selected={chosen?.slotId === morning.slotId && chosen.date === morning.date} onPress={() => onChoose(morning)} />
    </View>
  );
}
