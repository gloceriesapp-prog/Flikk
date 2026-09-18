// Lets a customer back out of an order before the rider has picked it up
// from the store (TrackOrderScreen.tsx's own cancel-eligibility check,
// mirroring backend/src/lib/orderStateMachine.ts's real isValidTransition
// — 'cancelled' only reachable from 'placed'/'packed', never once
// 'out_for_delivery'). Same reason-required, fixed-list pattern
// apps/rider's own CancelOrderModal already uses — a closed set is enough
// for a future support/dispute view to reason about, and faster to tap
// than to type.

import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';

const CANCEL_REASONS = ['Ordered by mistake', 'Changed my mind', 'Taking too long', 'Found it cheaper elsewhere', 'Other'];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
  confirming: boolean;
}

export function CancelOrderModal({ visible, onDismiss, onConfirm, confirming }: Props) {
  const [reason, setReason] = useState<string | null>(null);

  function handleConfirm() {
    if (!reason) return;
    onConfirm(reason);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="gap-5 rounded-t-3xl bg-white px-6 pb-safe-offset-6 pt-6">
          <View className="h-1.5 w-12 self-center rounded-full bg-gray-200" />
          <View className="gap-1">
            <Text className="text-xl font-semibold text-ink">Cancel this order?</Text>
            <Text className="text-[14px] font-medium text-ink/55">
              If you already paid online, we&apos;ll start your refund right away.
            </Text>
          </View>

          <View className="gap-2">
            {CANCEL_REASONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => setReason(option)}
                disabled={confirming}
                className={`rounded-2xl border px-4 py-3.5 ${reason === option ? 'border-gray-300 bg-gray-100' : 'border-gray-200'}`}
              >
                <Text className="text-[14px] font-semibold text-ink">{option}</Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-3">
            <PrimaryButton label="Confirm cancellation" onPress={handleConfirm} disabled={!reason} loading={confirming} variant="blue" />
            <Pressable onPress={onDismiss} disabled={confirming} className="items-center py-2">
              <Text className="text-[14px] font-semibold text-ink/50">Never mind, keep this order</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
