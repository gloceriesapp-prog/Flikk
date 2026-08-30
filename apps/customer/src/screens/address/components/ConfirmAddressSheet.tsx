// One last look before it's saved for real — a genuine confirm step, not
// decoration: once Confirm is tapped this becomes the address every future
// order reuses automatically (AddressFormScreen's own note), so catching a
// typo here is cheaper than catching it after a rider is already standing
// at the wrong door. RN-core Modal + slide, not a third-party
// bottom-sheet dependency.

import { Home01Icon, Briefcase01Icon, Location04Icon, NoteIcon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const LABEL_ICON: Record<string, typeof Home01Icon> = { Home: Home01Icon, Work: Briefcase01Icon };
const ACCENT = '#1447E6';

interface Props {
  visible: boolean;
  label: string;
  fullAddress: string;
  recipientName: string;
  recipientPhone: string;
  // Whatever was typed into AddressFormScreen's "Any instructions for the
  // rider?" field — shown here too, not just saved silently. Someone
  // reviewing "is this address right before I save it" should also be
  // able to catch a typo'd instruction, not just a typo'd address line.
  instructions: string;
  saving: boolean;
  onEdit: () => void;
  onConfirm: () => void;
}

export function ConfirmAddressSheet({
  visible,
  label,
  fullAddress,
  recipientName,
  recipientPhone,
  instructions,
  saving,
  onEdit,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onEdit}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="gap-4 rounded-t-3xl bg-white px-6 pb-safe-offset-6 pt-6">
          <View className="h-1.5 w-12 self-center rounded-full bg-gray-200" />

          <Text className="text-xl font-medium text-ink">Save this address?</Text>

          <View className="gap-3 rounded-2xl p-4" style={{ backgroundColor: '#FAFAFA' }}>
            <View className="flex-row items-center gap-2">
              <AppIcon icon={LABEL_ICON[label] ?? Location04Icon} size={16} color={ACCENT} />
              <Text className="text-sm font-bold text-black">{label}</Text>
            </View>
            <Text className="text-[15px] text-ink">{fullAddress}</Text>
            <View className="h-px bg-gray-200" />
            <Text className="text-[15px] font-medium text-ink">
              {recipientName} <Text className="font-medium text-ink">· {recipientPhone}</Text>
            </Text>

            {instructions.trim() ? (
              <>
                <View className="h-px bg-gray-200" />
                <View className="flex-row items-start gap-2">
                  <Text className="flex-1 text-base text-ink/70">Instrution: {instructions.trim()}</Text>
                </View>
              </>
            ) : null}
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={onEdit} disabled={saving} className="flex-1 items-center rounded-2xl border border-gray-200 py-4">
              <Text className="text-lg font-medium text-ink">Edit details</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={saving}
              className="flex-1 items-center rounded-2xl py-4"
              style={{ backgroundColor: ACCENT, opacity: saving ? 0.6 : 1 }}
            >
              <Text className="text-lg font-medium text-white">{saving ? 'Saving…' : 'Confirm & save'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
