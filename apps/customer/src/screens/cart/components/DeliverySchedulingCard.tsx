// "When should we deliver?" card — sits right above DeliveryTipCard. Two
// modes, a segmented toggle between them (same rounded-pill recipe real
// delivery apps use, not a raw date/time picker — a day chip + a 2-hour
// slot chip is what a customer actually wants to tap, not a wheel
// picker). "Now" is the default and covers today's actual delivery flow
// (status-only 4-stage tracking, CLAUDE.md); "Schedule" is additive, not a
// replacement for it.
//
// Selection is lifted up (like DeliveryTipCard's tip) because it needs to
// travel to Checkout eventually. No backend field for a scheduled
// delivery time exists yet (backend/src/routes/orders.ts has no such
// column) — flagged, not faked: the picker is real, wiring it into order
// creation is a follow-up once that column exists.

import { useMemo } from 'react';
import { Clock01Icon, ZapIcon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';

const ACCENT = '#155DFC';

export interface ScheduledSlot {
  dayLabel: string;
  dayKey: string;
  timeLabel: string;
}

export type DeliverySelection = { mode: 'now' } | { mode: 'schedule'; slot: ScheduledSlot | null };

const TIME_SLOTS = ['8 - 10 AM', '10 AM - 12 PM', '12 - 2 PM', '2 - 4 PM', '4 - 6 PM', '6 - 8 PM', '8 - 10 PM'];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDayOptions() {
  const days: { key: string; label: string; sublabel: string; isToday: boolean }[] = [];
  const today = new Date();
  for (let offset = 0; offset < 6; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    days.push({
      key: date.toDateString(),
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : WEEKDAYS[date.getDay()],
      sublabel: `${date.getDate()} ${date.toLocaleString('en-US', { month: 'short' })}`,
      isToday: offset === 0,
    });
  }
  return days;
}

// Today's already-passed slots aren't real options — "8-10 AM" showing as
// tappable at 6 PM is the kind of small detail that makes a picker feel
// broken even though nothing else is wrong with it.
function isSlotPast(dayIsToday: boolean, slotLabel: string): boolean {
  if (!dayIsToday) return false;
  const startHour = Number.parseInt(slotLabel, 10);
  const isPM = slotLabel.includes('PM') || (slotLabel.startsWith('12') && slotLabel.includes('PM'));
  const hour24 = startHour === 12 ? 12 : isPM ? startHour + 12 : startHour;
  return new Date().getHours() >= hour24;
}

interface Props {
  selection: DeliverySelection;
  onChange: (selection: DeliverySelection) => void;
}

export function DeliverySchedulingCard({ selection, onChange }: Props) {
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const selectedDayKey = selection.mode === 'schedule' ? (selection.slot?.dayKey ?? dayOptions[0].key) : null;
  const selectedDay = dayOptions.find((d) => d.key === selectedDayKey) ?? dayOptions[0];

  function selectDay(day: (typeof dayOptions)[number]) {
    onChange({
      mode: 'schedule',
      slot: { dayKey: day.key, dayLabel: day.label === 'Today' || day.label === 'Tomorrow' ? day.label : `${day.label} ${day.sublabel}`, timeLabel: '' },
    });
  }

  function selectTime(timeLabel: string) {
    onChange({ mode: 'schedule', slot: { dayKey: selectedDay.key, dayLabel: selectedDay.label === 'Today' || selectedDay.label === 'Tomorrow' ? selectedDay.label : `${selectedDay.label} ${selectedDay.sublabel}`, timeLabel } });
  }

  const isScheduled = selection.mode === 'schedule';
  const selectedTime = isScheduled ? selection.slot?.timeLabel : null;

  return (
    <View className="gap-3.5 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}14` }}>
          <AppIcon icon={Clock01Icon} size={18} color={ACCENT} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-medium text-ink">When should we deliver?</Text>
          <Text className="text-[12.5px] text-ink/45">Pick a time that works for you</Text>
        </View>
      </View>

      {/* Segmented toggle — one filled pill slides between the two modes,
          same rounded-full recipe as the rest of this card, no separate
          "tab bar" component needed for two options. */}
      <View className="flex-row rounded-full bg-[#F3F4F6] p-1">
        <Pressable onPress={() => onChange({ mode: 'now' })} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5" style={{ backgroundColor: !isScheduled ? '#FFFFFF' : 'transparent' }}>
          <AppIcon icon={ZapIcon} size={14} color={!isScheduled ? ACCENT : '#6B7280'} />
          <Text className="text-[13.5px] font-medium" style={{ color: !isScheduled ? ACCENT : '#6B7280' }}>
            Deliver now
          </Text>
        </Pressable>
        <Pressable onPress={() => onChange({ mode: 'schedule', slot: null })} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2.5" style={{ backgroundColor: isScheduled ? '#FFFFFF' : 'transparent' }}>
          <AppIcon icon={Clock01Icon} size={14} color={isScheduled ? ACCENT : '#6B7280'} />
          <Text className="text-[13.5px] font-medium" style={{ color: isScheduled ? ACCENT : '#6B7280' }}>
            Schedule
          </Text>
        </Pressable>
      </View>

      {!isScheduled ? (
        <Text className="text-[12.5px] text-ink/45">Fastest delivery — your order goes out as soon as it&apos;s packed.</Text>
      ) : (
        <View className="gap-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {dayOptions.map((day) => {
              const isSelected = day.key === selectedDay.key;
              return (
                <Pressable
                  key={day.key}
                  onPress={() => selectDay(day)}
                  className="items-center rounded-xl border px-3.5 py-2"
                  style={{ borderColor: isSelected ? ACCENT : '#E5E7EB', backgroundColor: isSelected ? `${ACCENT}0F` : '#F9FAFB' }}
                >
                  <Text className="text-[13px] font-medium" style={{ color: isSelected ? ACCENT : '#101C10' }}>
                    {day.label}
                  </Text>
                  <Text className="text-[11px]" style={{ color: isSelected ? ACCENT : '#9CA3AF' }}>
                    {day.sublabel}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="flex-row flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => {
              const disabled = isSlotPast(selectedDay.isToday, slot);
              const isSelected = selectedTime === slot;
              return (
                <Pressable
                  key={slot}
                  disabled={disabled}
                  onPress={() => selectTime(slot)}
                  className="rounded-lg border px-3 py-2"
                  style={{
                    borderColor: isSelected ? ACCENT : '#E5E7EB',
                    backgroundColor: disabled ? '#F3F4F6' : isSelected ? `${ACCENT}0F` : '#F9FAFB',
                    opacity: disabled ? 0.45 : 1,
                  }}
                >
                  <Text className="text-[12.5px] font-medium" style={{ color: isSelected ? ACCENT : disabled ? '#9CA3AF' : '#101C10' }}>
                    {slot}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
