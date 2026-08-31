// Real UX for "confirm the handoff," even though there's no backend to
// actually check the code against yet — same "any code of the right shape
// works" mock rule as the auth flow (api/auth.ts's own note), applied
// here to the delivery-proof step instead of login. A real backend
// integration would generate this code server-side and check it here;
// until then, any 4-digit code the rider enters marks it delivered — the
// point right now is the real interaction shape, not a fake security
// check.
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
  onConfirm: () => void;
}

export function DeliveryOtpModal({ visible, onCancel, onConfirm }: Props) {
  const [code, setCode] = useState('');

  function handleConfirm() {
    onConfirm();
    setCode('');
  }

  const digits = code.padEnd(4, ' ').split('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
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
            <PrimaryButton label="Confirm & complete" onPress={handleConfirm} disabled={code.length !== 4} />
            <Pressable onPress={onCancel} className="items-center py-2">
              <Text className="text-[14px] font-semibold text-ink/50">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
