// Lets a rider bail on an assigned order (bike breakdown, store closed,
// store won't hand over) instead of being stuck sitting on it — a rider with
// no way out of a broken order is a guaranteed rage-quit / 1-star review.
// Reason is required and picked from a fixed list, not free text — a closed
// set is enough for a future support/dispute view to reason about, and it's
// faster to tap than to type standing in a doorway.
//
// The list is the shared, pickup-phase reason set (@flikk/shared) — cancel
// only ever shows pre-pickup, so old drop-phase options ("customer
// unreachable", "wrong address") were removed: they can't apply here. We
// store the CODE (stable) and show the LABEL; the backend validates the code
// against its own mirror of this list.

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { RIDER_CANCEL_REASONS } from '@flikk/shared';
import { PrimaryButton } from '../../../components/PrimaryButton';

interface Props {
  visible: boolean;
  onCancel: () => void;
  // Receives the reason CODE (e.g. 'store_closed'), not the display label.
  onConfirm: (reasonCode: string) => void;
}

export function CancelOrderModal({ visible, onCancel, onConfirm }: Props) {
  const [code, setCode] = useState<string | null>(null);

  function handleConfirm() {
    if (!code) return;
    onConfirm(code);
    setCode(null);
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
            {RIDER_CANCEL_REASONS.map((option) => (
              <Pressable
                key={option.code}
                onPress={() => setCode(option.code)}
                className={`rounded-2xl border px-4 py-3.5 ${code === option.code ? 'border-danger bg-danger/5' : 'border-gray-200'}`}
              >
                <Text className={`text-[14px] font-semibold ${code === option.code ? 'text-danger' : 'text-ink'}`}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-3">
            <PrimaryButton label="Confirm cancellation" onPress={handleConfirm} disabled={!code} />
            <Pressable onPress={onCancel} className="items-center py-2">
              <Text className="text-[14px] font-semibold text-ink/50">Never mind, keep this order</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
