// Real delivery-proof step: the customer sees a 4-digit code on their own
// order once it's out_for_delivery (customer app's DeliveryRiderCard, backed
// by orders.delivery_otp), reads it out at the door, the rider enters it
// here. onConfirm hands the code up to OrderDetailScreen, which sends it to
// the backend (PATCH /orders/:id/status) — a wrong code is a real 400 that
// keeps this modal open for a retry, a correct one completes delivery and
// the code is single-use server-side (backend/src/lib/deliveryOtp.ts).
//
// 4 digits, not OtpBoxInput's own 6 — delivery-proof codes are shorter
// than login OTPs in every real rider app (Swiggy/Blinkit both use 4), so
// this owns its own small box row rather than parameterizing the shared
// component's fixed length for a case nothing else in this app needs.

import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';

interface Props {
  visible: boolean;
  onCancel: () => void;
  // Receives the entered 4-digit code — the caller verifies it against the
  // backend and, on failure, leaves this modal open so the rider can retry.
  onConfirm: (code: string) => void;
  // True while the delivered PATCH is in flight (caller-owned) — disables the
  // button so a double-tap can't fire two delivery writes.
  submitting?: boolean;
}

export function DeliveryOtpModal({ visible, onCancel, onConfirm, submitting }: Props) {
  const [code, setCode] = useState('');

  function handleCancel() {
    setCode('');
    onCancel();
  }

  const digits = code.padEnd(4, ' ').split('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="gap-5 rounded-t-3xl bg-white px-6 pb-safe-offset-6 pt-6">
          <View className="h-1.5 w-12 self-center rounded-full bg-gray-200" />
          <View className="gap-1">
            <Text className="text-xl font-bold text-ink">Confirm delivery</Text>
            <Text className="text-[14px] text-ink/55">Ask the customer for the 4-digit code shown on their app.</Text>
          </View>

          <Pressable className="flex-row justify-center gap-3">
            {digits.map((digit, i) => (
              <View
                key={i}
                className={`h-14 w-14 items-center justify-center rounded-2xl border bg-white ${i === code.length ? 'border-ink' : 'border-gray-200'}`}
              >
                <Text className="text-2xl font-bold text-ink">{digit.trim()}</Text>
              </View>
            ))}
            <TextInput
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              className="absolute h-14 w-full opacity-0"
            />
          </Pressable>

          <View className="gap-3">
            <PrimaryButton label="Confirm & complete" onPress={() => onConfirm(code)} disabled={code.length !== 4 || !!submitting} />
            <Pressable onPress={handleCancel} className="items-center py-2">
              <Text className="text-[14px] font-semibold text-ink/50">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
