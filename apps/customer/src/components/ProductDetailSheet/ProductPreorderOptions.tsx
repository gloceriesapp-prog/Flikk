// Pre-order products (Product.preorder): pick the delivery day and slot
// before adding, cinema-booking style: five date cards from today, greyed out
// where the product needs more notice or no slot is left, then the slots for
// that day. The choice is the whole cart's delivery (store/preorder.ts); the
// item goes in at its bulk minimum.

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { bookingDates, cartPreorder, dayCard, dayOpen, slotOpen, type CartPreorder } from '../../store/preorder';
import { usePreorders } from '../../screens/home/preorders/usePreorders';
import { usePreorderDayStore } from '../../store/usePreorderDayStore';

interface Props {
  minQty: number;
  leadDays: number;
  value?: CartPreorder;
  onChange: (preorder: CartPreorder | undefined) => void;
}

const BLUE = '#155DFC';

export function ProductPreorderOptions({ minQty, leadDays, value, onChange }: Props) {
  const slots = usePreorders().data?.slots ?? [];
  const dates = bookingDates();
  const open = dates.filter((d) => dayOpen(d, leadDays, slots));
  const homeDay = usePreorderDayStore((s) => s.day);
  const setHomeDay = usePreorderDayStore((s) => s.setDay);
  // The cart's day, else the day tapped on Home, if this product can make it.
  const [day, setDay] = useState(
    value && open.includes(value.date) ? value.date : homeDay && open.includes(homeDay) ? homeDay : open[0],
  );
  const slotId = day && value?.date === day ? value.slotId : undefined;
  const choose = (nextDay: string, nextSlotId: string | undefined) => {
    setDay(nextDay);
    setHomeDay(nextDay);
    const slot = slots.find((s) => s.id === nextSlotId && slotOpen(nextDay, s));
    onChange(slot ? cartPreorder(nextDay, slot) : undefined);
  };
  return (
    <View className="gap-3">
      <View className="rounded-[12px] bg-[#F3F6FF] px-3 py-2.5">
        <Text className="text-[13px] font-semibold text-ink">Pre-order · minimum {minQty}</Text>
        <Text className="mt-0.5 text-[12px] text-ink/60">
          Book any day up to 4 days ahead. The shop confirms and delivers in your slot
          {leadDays > 0 ? ` (needs ${leadDays === 1 ? '1 day' : `${leadDays} days`}' notice)` : ''}.
        </Text>
      </View>

      <Text className="text-[13px] font-semibold text-ink/60">Pick a day</Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {dates.map((d) => {
          const card = dayCard(d);
          const enabled = open.includes(d);
          const selected = enabled && d === day;
          return (
            <Pressable
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !enabled }}
              accessibilityLabel={`${card.top} ${card.day} ${card.month}${enabled ? '' : ', not available'}`}
              disabled={!enabled}
              onPress={() => choose(d, value?.slotId)}
              className="flex-1 items-center rounded-[14px] border py-2.5"
              style={{
                borderColor: selected ? BLUE : '#E5E7EB',
                backgroundColor: selected ? BLUE : enabled ? '#FFFFFF' : '#F3F4F6',
                opacity: enabled ? 1 : 0.45,
              }}
            >
              <Text className="text-[11px] font-semibold uppercase tracking-[0.5px]" style={{ color: selected ? '#FFFFFFCC' : '#6B7280' }}>{card.top}</Text>
              <Text className="mt-0.5 text-[20px] font-bold" style={{ color: selected ? '#FFFFFF' : '#101C10' }}>{card.day}</Text>
              <Text className="text-[11px]" style={{ color: selected ? '#FFFFFFCC' : '#6B7280' }}>{card.month}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-[13px] font-semibold text-ink/60">Pick a time</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {slots.map((slot) => {
          const enabled = !!day && slotOpen(day, slot);
          const selected = enabled && slot.id === slotId;
          return (
            <Pressable
              key={slot.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !enabled }}
              disabled={!enabled}
              onPress={() => day && choose(day, slot.id)}
              className="items-center rounded-[12px] border px-3.5 py-2.5"
              style={{
                borderColor: selected ? BLUE : '#DADADA',
                backgroundColor: selected ? BLUE : '#FFFFFF',
                opacity: enabled ? 1 : 0.4,
              }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: selected ? '#FFFFFF' : '#101C10' }}>{slot.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
