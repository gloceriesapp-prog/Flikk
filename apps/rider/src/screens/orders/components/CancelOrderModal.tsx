// Lets a rider bail on an assigned order (bike breakdown, wrong address,
// store closed) instead of being stuck sitting on it — a rider with no
// way out of a broken order is a guaranteed rage-quit / 1-star review.
// Reason is required and picked from a fixed list, not free text — a
// closed set is enough for a future support/dispute view to reason about,
// and it's faster to tap than to type standing in a doorway.

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';

const CANCEL_REASONS = [
  'Vehicle breakdown',
  'Store is closed',
  'Wrong / unreachable address',
  'Customer unreachable',
  'Unsafe to continue',
  'Other',
];

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelOrderModal({ visible, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState<string | null>(null);

  function handleConfirm() {
    if (!reason) return;
    onConfirm(reason);
    setReason(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="gap-5 rounded-t-3xl bg-white px-6 pb-safe-offset-6 pt-6">
          <View className="h-1.5 w-12 self-center rounded-full bg-gray-200" />
          <View className="gap-1">
            <Text className="text-xl font-semibold text-ink">Cancel this delivery?</Text>
            <Text className="text-[14px] text-ink/55 font-medium">Tell us why, this helps if the store or customer follows up.</Text>
          </View>

          <View className="gap-2">
            {CANCEL_REASONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setReason(option)}
                className={`rounded-2xl border px-4 py-3.5 ${reason === option ? 'border-danger bg-danger/5' : 'border-gray-200'}`}
              >
                <Text className={`text-[14px] font-semibold ${reason === option ? 'text-danger' : 'text-ink'}`}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-3">
            <PrimaryButton label="Confirm cancellation" onPress={handleConfirm} disabled={!reason} />
            <Pressable onPress={onCancel} className="items-center py-2">
              <Text className="text-[14px] font-semibold text-ink/50">Never mind, keep this order</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
