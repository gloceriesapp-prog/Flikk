// Working hours — the rider sets a weekly availability schedule and a master
// "go online automatically during these hours" switch. Reached from Profile's
// "Working hours" row (a stack screen, presentation 'card'). Top bar matches
// ProfileScreen's (flat #F1F1F4 back circle · centered title). Body: the auto-
// online master toggle with a one-line honest helper (it only works while the
// app is open and never pulls the rider offline), then seven day rows rendered
// Mon-first (friendlier than Sun-first) while the underlying data keeps the
// 0=Sun..6=Sat index the backend contract uses.
//
// Real data: GET /rider/availability on mount (seeded with defaultWeek() when
// the backend has never been configured, availability: []), PATCH on Save.
//
// TIME PICKER: no @react-native-community/datetimepicker (or expo equivalent)
// is installed, and this feature isn't worth adding one — so each start/end is
// a tap-to-open modal listing half-hour presets, built from existing RN
// primitives + brand tokens. Half-hour granularity is all a shift schedule
// needs.

import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { IosSwitch } from '../../components/IosSwitch';
import { colors } from '../../theme/tokens';
import { fetchAvailability, saveAvailability, defaultWeek, type DaySchedule } from '../../api/availability';

const CARD_BORDER = '#EAECEE';

// Data is 0=Sun..6=Sat; render Mon-first. label is the row title, day is the
// DaySchedule.day it maps to.
const DISPLAY_DAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

// Half-hour presets '00:00'..'23:30' — the only values the time pills offer.
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

// 'HH:MM' → minutes, for the end>start validation only.
const toMinutes = (hhmm: string) => Number(hhmm.split(':')[0]) * 60 + Number(hhmm.split(':')[1]);

export function AvailabilityScreen() {
  const navigation = useNavigation();

  const { data, isLoading } = useQuery({
    queryKey: ['rider', 'availability'],
    queryFn: fetchAvailability,
  });

  // Local editable copy — seeded from the server (or defaultWeek() when never
  // configured), kept sorted 0..6 so index math and the backend contract agree.
  const [week, setWeek] = useState<DaySchedule[] | null>(null);
  const [autoOnline, setAutoOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which day's which end is being picked, if any.
  const [picker, setPicker] = useState<{ day: number; field: 'start' | 'end' } | null>(null);

  // Seed local state once the query resolves (only if we haven't already, so
  // an in-flight edit isn't clobbered by a background refetch).
  // Done during render (React's pattern for deriving state from loaded data)
  // instead of an effect, so the screen doesn't render once with empty state.
  if (data && week === null) {
    const base = data.availability.length ? [...data.availability].sort((a, b) => a.day - b.day) : defaultWeek();
    setWeek(base);
    setAutoOnline(data.autoOnline);
  }

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setError(null);
    setWeek((prev) => (prev ? prev.map((d) => (d.day === day ? { ...d, ...patch } : d)) : prev));
  }

  async function onSave() {
    if (!week) return;
    // end must be strictly after start on every enabled day — surface inline,
    // never crash or silently save a nonsense window.
    const bad = week.find((d) => d.enabled && toMinutes(d.end) <= toMinutes(d.start));
    if (bad) {
      const label = DISPLAY_DAYS.find((x) => x.day === bad.day)?.label ?? 'A day';
      setError(`${label}: end time must be after start time.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveAvailability(week, autoOnline);
      navigation.goBack();
    } catch (e) {
      // Client-side end<=start guard above is the primary UX; this is the
      // fallback for a server-side rejection. client.ts already unwraps the
      // house error envelope ({ error: { code, message } }) onto ApiError, so
      // a backend INVALID_SCHEDULE surfaces its own detail rather than a
      // generic message.
      const err = e as { code?: string; message?: string };
      setError(err?.code === 'INVALID_SCHEDULE' && err.message ? err.message : 'Could not save. Check your connection and try again.');
      setSaving(false);
    }
  }

  const dayFor = (day: number) => week?.find((d) => d.day === day);

  if (isLoading || !week) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fbfafa]">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbfafa]">
      {/* Top bar — matches ProfileScreen. */}
      <View className="flex-row items-center px-5 pb-2 pt-safe-offset-3">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-[#F1F1F4]"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-[18px] font-semibold text-ink">Working hours</Text>
        {/* Spacer to keep the title centered against the back circle. */}
        <View className="h-11 w-11" />
      </View>

      <ScrollView contentContainerClassName="gap-3 px-5 pb-40 pt-2" showsVerticalScrollIndicator={false}>
        {/* Master auto-online toggle. */}
        <View className="rounded-[16px] border px-4 py-3.5" style={{ borderColor: CARD_BORDER }}>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">Go online automatically during these hours</Text>
            </View>
            <IosSwitch value={autoOnline} onValueChange={setAutoOnline} />
          </View>
          <Text className="mt-2 text-[13px] font-medium leading-[18px] text-ink/50">
            Only works while the app is open. It never takes you offline — you always stay in control of ending your shift.
          </Text>
        </View>

        {error && (
          <View className="rounded-[13px] px-4 py-3" style={{ backgroundColor: `${colors.danger}14` }}>
            <Text className="text-[13px] font-semibold" style={{ color: colors.danger }}>{error}</Text>
          </View>
        )}

        {/* Day rows — Mon-first display, 0=Sun data. */}
        <View className="mt-1 gap-2">
          {DISPLAY_DAYS.map(({ day, label }) => {
            const entry = dayFor(day);
            if (!entry) return null;
            return (
              <View key={day} className="rounded-[16px] border px-4 py-3.5" style={{ borderColor: CARD_BORDER }}>
                <View className="flex-row items-center gap-3">
                  <Text className="flex-1 text-[15px] font-semibold text-ink">{label}</Text>
                  <IosSwitch value={entry.enabled} onValueChange={(v) => updateDay(day, { enabled: v })} />
                </View>
                {entry.enabled && (
                  <View className="mt-3 flex-row items-center gap-2">
                    <TimePill label="Start" value={entry.start} onPress={() => setPicker({ day, field: 'start' })} />
                    <Text className="text-[14px] font-semibold text-ink/40">to</Text>
                    <TimePill label="End" value={entry.end} onPress={() => setPicker({ day, field: 'end' })} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer Save — coral is the only CTA color (CLAUDE.md). */}
      <View className="absolute inset-x-0 bottom-0 border-t bg-[#fbfafa] px-5 pb-safe-offset-3 pt-3" style={{ borderColor: CARD_BORDER }}>
        <Pressable
          onPress={onSave}
          disabled={saving}
          className="h-[52px] items-center justify-center rounded-[13px]"
          style={({ pressed }) => ({ backgroundColor: colors.coral, opacity: saving ? 0.6 : pressed ? 0.85 : 1 })}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-[16px] font-bold text-white">Save</Text>
          )}
        </Pressable>
      </View>

      <TimePickerModal
        visible={picker !== null}
        current={picker ? (dayFor(picker.day)?.[picker.field] ?? '') : ''}
        onSelect={(value) => {
          if (picker) updateDay(picker.day, { [picker.field]: value });
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

function TimePill({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-[13px] border px-3 py-2.5"
      style={({ pressed }) => ({ borderColor: CARD_BORDER, opacity: pressed ? 0.6 : 1 })}
    >
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">{label}</Text>
      <Text className="mt-0.5 text-[16px] font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
    </Pressable>
  );
}

function TimePickerModal({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* Inner press stopped from closing the sheet. */}
        <Pressable className="max-h-[60%] rounded-t-[20px] bg-white pt-3" onPress={() => {}}>
          <View className="mb-2 items-center">
            <View className="h-1 w-10 rounded-full bg-ink/10" />
            <Text className="mt-3 text-[16px] font-semibold text-ink">Select time</Text>
          </View>
          <ScrollView contentContainerClassName="pb-safe-offset-4 pt-1" showsVerticalScrollIndicator={false}>
            {TIME_OPTIONS.map((t) => {
              const selected = t === current;
              return (
                <Pressable
                  key={t}
                  onPress={() => onSelect(t)}
                  className="mx-4 flex-row items-center justify-center rounded-[12px] py-3"
                  style={({ pressed }) => ({
                    backgroundColor: selected ? colors.limeSoft : pressed ? '#F1F1F4' : 'transparent',
                  })}
                >
                  <Text
                    className="text-[16px]"
                    style={{ fontVariant: ['tabular-nums'], color: colors.ink, fontWeight: selected ? '700' : '500' }}
                  >
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
