// Identity hero — avatar initial + name + phone in one compact strip, DOB
// as a small chip beneath it, not three stacked list rows. Redesigned away
// from the earlier Blinkit-style row list per an explicit ask for
// something more distinctly this app's own — a single premium card reading
// as "who you are" up top, rather than a settings-form look this early on
// the screen. Same real backend as before, unchanged: PATCH /auth/me
// (useProfile.ts's own useUpdateProfileField).
//
// Phone is still never editable — verified OTP identity, not a free-text
// field.

import { useState } from 'react';
import { CakeIcon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useUpdateProfileField, type Profile } from '../useProfile';

interface Props {
  profile: Profile;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/^\+91/, '');
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function formatBirthday(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function AccountDetailsCard({ profile }: Props) {
  const { mutate: saveField } = useUpdateProfileField();

  const [isNameEditOpen, setIsNameEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name ?? '');

  const [isDobPickerOpen, setIsDobPickerOpen] = useState(false);
  const [dobDraft, setDobDraft] = useState(profile.birthday ? new Date(profile.birthday) : new Date(2000, 0, 1));

  const initial = (profile.name?.trim().charAt(0) || profile.phone.replace(/^\+91/, '').charAt(0)).toUpperCase();

  function openNameEditor() {
    setNameDraft(profile.name ?? '');
    setIsNameEditOpen(true);
  }

  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed) saveField({ name: trimmed });
    setIsNameEditOpen(false);
  }

  function handleDobChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setIsDobPickerOpen(false);
      if (event.type === 'set' && date) saveField({ birthday: toISODate(date) });
      return;
    }
    if (date) setDobDraft(date);
  }

  return (
    <>
      <View className="overflow-hidden rounded-[24px] bg-white p-4">
        <View className="flex-row items-center gap-3.5">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Text className="text-xl font-semibold text-ink/70">{initial}</Text>
          </View>

          <View className="flex-1">
            <Pressable onPress={openNameEditor} className="flex-row items-center gap-1.5">
              <Text className="text-[17px] font-semibold text-ink" numberOfLines={1}>
                {profile.name?.trim() || 'Add your name'}
              </Text>
              <AppIcon icon={PencilEdit02Icon} size={12} color={`${colors.ink}40`} strokeWidth={1.8} />
            </Pressable>
            <Text className="mt-0.5 text-[13px] font-normal text-ink/45">{formatPhone(profile.phone)}</Text>
          </View>
        </View>

        {/* DOB chip — small pill, not a third row. Gray throughout, same
            filled shade whether set or not (no green accent). */}
        <Pressable
          onPress={() => setIsDobPickerOpen(true)}
          className="mt-3.5 flex-row items-center self-start gap-1.5 rounded-full bg-gray-100 px-3 py-1.5"
        >
          <AppIcon icon={CakeIcon} size={13} color={`${colors.ink}99`} strokeWidth={1.8} />
          <Text className="text-[12px] font-medium text-ink/60">
            {profile.birthday ? formatBirthday(profile.birthday) : 'Add your birthday'}
          </Text>
        </Pressable>
      </View>

      {/* Name editor — plain modal + TextInput. */}
      <Modal visible={isNameEditOpen} transparent animationType="fade" onRequestClose={() => setIsNameEditOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full rounded-3xl bg-white p-5">
            <Text className="text-base font-semibold text-ink">Your name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Enter your name"
              autoFocus
              className="mt-3 rounded-xl border border-gray-200 px-3.5 py-3 text-[15px] text-ink"
            />
            <View className="mt-4 flex-row justify-end gap-4">
              <Pressable onPress={() => setIsNameEditOpen(false)} hitSlop={8}>
                <Text className="text-[15px] font-medium text-ink/50">Cancel</Text>
              </Pressable>
              <Pressable onPress={saveName} hitSlop={8}>
                <Text className="text-[15px] font-semibold text-ink">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date-of-birth picker — Android opens its own native dialog and
          dismisses itself on select; iOS has no picker chrome of its own,
          so this wraps its spinner in a bottom sheet with Cancel/Done. */}
      {Platform.OS === 'android' && isDobPickerOpen && (
        <DateTimePicker value={dobDraft} mode="date" display="default" maximumDate={new Date()} onChange={handleDobChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={isDobPickerOpen} transparent animationType="slide" onRequestClose={() => setIsDobPickerOpen(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white pb-safe">
              <View className="flex-row items-center justify-between px-5 pt-4">
                <Pressable onPress={() => setIsDobPickerOpen(false)} hitSlop={8}>
                  <Text className="text-[15px] font-medium text-ink/50">Cancel</Text>
                </Pressable>
                <Text className="text-[15px] font-semibold text-ink">Date of birth</Text>
                <Pressable
                  onPress={() => {
                    setIsDobPickerOpen(false);
                    saveField({ birthday: toISODate(dobDraft) });
                  }}
                  hitSlop={8}
                >
                  <Text className="text-[15px] font-semibold text-ink">Done</Text>
                </Pressable>
              </View>
              {/* backgroundColor here, not left to the native default — on
                  some iOS versions/devices the spinner's own UIDatePicker
                  renders translucent by default, letting whatever's behind
                  this sheet bleed through instead of a solid white picker
                  (device-dependent, which is why it only showed up on
                  some phones). Explicit white forces it opaque everywhere. */}
              <DateTimePicker
                value={dobDraft}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDobChange}
                themeVariant="light"
                style={{ backgroundColor: '#FFFFFF' }}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
