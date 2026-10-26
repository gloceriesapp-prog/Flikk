import { useState } from 'react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
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

export function AccountDetailsCard({ profile }: Props) {
  const { mutate: saveField } = useUpdateProfileField();

  const [isNameEditOpen, setIsNameEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name ?? '');

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

      </View>

      {/* Name editor — plain modal + TextInput. */}
      <Modal visible={isNameEditOpen} transparent animationType="fade" onRequestClose={() => setIsNameEditOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full rounded-3xl bg-white p-5">
            <Text className="text-base font-semibold text-ink">Your name</Text>
            <TextInput
              maxLength={100}
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

    </>
  );
}
