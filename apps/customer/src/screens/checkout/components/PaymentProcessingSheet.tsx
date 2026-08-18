// Bottom sheet over CheckoutScreen (RN's core Modal, transparent + slide,
// works natively on both iOS and Android — no extra bottom-sheet library).
// Fully automatic now, no manual test buttons: "Processing..." for 4s, then
// a brief "Success!" phase, then onComplete() fires and the caller
// navigates on to the receipt (see CheckoutScreen.tsx). Real Razorpay
// timing/outcome wiring is a follow-up — this is the placeholder sequence
// until then.

import { useEffect, useState } from 'react';
import { Image, Text, View, Modal } from 'react-native';
import { SuccessSeal } from '../../../components/SuccessSeal';
import { colors } from '../../../theme/tokens';

const PROCESSING_DURATION_MS = 4000;
const SUCCESS_DURATION_MS = 1800;
const PROCESSING_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/plane.png';

type Phase = 'processing' | 'success';

interface Props {
  visible: boolean;
  onComplete: () => void;
}

export function PaymentProcessingSheet({ visible, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('processing');

  useEffect(() => {
    if (!visible) return;

    const toSuccess = setTimeout(() => setPhase('success'), PROCESSING_DURATION_MS);
    return () => clearTimeout(toSuccess);
  }, [visible]);

  useEffect(() => {
    if (!visible || phase !== 'success') return;

    const toComplete = setTimeout(onComplete, SUCCESS_DURATION_MS);
    return () => clearTimeout(toComplete);
  }, [visible, phase, onComplete]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="items-center rounded-t-[32px] bg-white pb-safe-offset-10 pt-3">
          <View className="h-1.5 w-12 rounded-full bg-gray-200" />

          {phase === 'processing' ? (
            <View className="items-center gap-5 px-8 pb-10 pt-8">
              <Image source={{ uri: PROCESSING_IMAGE_URI }} className="h-24 w-24" resizeMode="contain" />
              <View className="items-center gap-1">
                <Text className="text-xl font-extrabold text-ink">Processing...</Text>
                <Text className="text-sm font-medium text-ink/50">Your payment is processing</Text>
              </View>
            </View>
          ) : (
            <View className="items-center gap-5 px-8 pb-10 pt-8">
              <SuccessSeal size={96} color={colors.success} />
              <View className="items-center gap-1">
                <Text className="text-xl font-extrabold text-ink">Success!</Text>
                <Text className="text-sm font-medium text-ink/50">Your payment was successful</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
