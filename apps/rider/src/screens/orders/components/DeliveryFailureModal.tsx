// Lets a rider close out a drop that can't be completed after pickup (customer
// unreachable, wrong address, address not found, refused) instead of being
// stuck holding an order they can't deliver — the POST-pickup counterpart to
// CancelOrderModal (which is pre-pickup only). Reason is required and picked
// from a fixed list, not free text: a closed set is enough for admin's manual
// refund review to reason about, and faster to tap than to type at the door.
//
// The list is the shared drop-phase reason set (@gloceries/shared) — the exact
// reasons CancelOrderModal omits (cancel can't apply once the parcel's in
// hand). We store the CODE (stable) and show the LABEL; the backend validates
// the code against its own mirror before moving the order to 'failed'.

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { RIDER_DELIVERY_FAILURE_REASONS } from '@gloceries/shared';
import { PrimaryButton } from '../../../components/PrimaryButton';

interface Props {
  visible: boolean;
  onCancel: () => void;
  // Receives the reason CODE (e.g. 'customer_unreachable'), not the display label.
  onConfirm: (reasonCode: string) => void;
}

export function DeliveryFailureModal({ visible, onCancel, onConfirm }: Props) {
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
            <Text className="text-xl font-semibold text-ink">Couldn’t complete this delivery?</Text>
            <Text className="text-[14px] text-ink/55 font-medium">Tell us what happened — this goes to the team for a refund review.</Text>
          </View>

          <View className="gap-2">
            {RIDER_DELIVERY_FAILURE_REASONS.map((option) => (
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
            <PrimaryButton label="Mark delivery failed" onPress={handleConfirm} disabled={!code} />
            <Pressable onPress={onCancel} className="items-center py-2">
              <Text className="text-[14px] font-semibold text-ink/50">Never mind, keep trying</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
