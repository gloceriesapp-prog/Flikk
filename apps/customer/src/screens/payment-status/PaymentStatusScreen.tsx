// Real failure/timeout destination for the UPI Intent flow — reached only
// from PaymentProcessingScreen.tsx when payments/pollOrderPaid.ts's poll
// times out with no webhook confirmation (backend/src/payments/webhook.ts
// is the only thing that can ever mark an order paid, so a timeout here
// means genuinely "not confirmed yet", not "definitely failed" — the
// order stays exactly as POST /orders left it, unpaid, and
// jobs/expireUnpaidOrders.ts cleans it up after 20 min if it's truly
// abandoned). Standard Checkout (card/online) failures still stay inline
// on Checkout itself — Razorpay's own SDK already shows the failure
// inside its bundled UI before ever returning control there, so that path
// never reaches this screen.
//
// Both actions below use navigation.reset, not goBack/navigate — a plain
// goBack() only pops one level, and if the customer retries a few times
// (each retry pushes a fresh PaymentProcessing -> replaces itself with a
// fresh PaymentStatus, CheckoutScreen.tsx's own handlePay), the stack
// keeps accumulating Checkout/PaymentStatus pairs underneath. A single
// pop then lands back on a STALE PaymentStatus/Checkout instead of a
// clean one — this was the exact reported bug: back from PaymentStatus
// showed Checkout, back again showed PaymentStatus again. Resetting
// straight to the known-good shape ([Cart, Checkout] to retry, [Cart]
// alone to leave) wipes every stale entry in one move regardless of how
// many retries piled up, so there's nothing left to loop back into.
// Checkout's own header back button (CheckoutHeader.tsx) calls
// navigation.goBack(), so it needs a real Cart still under it — the
// retry reset keeps that intact rather than resetting to Checkout alone.
//
// Hardware back (Android) and the swipe gesture (iOS, gestureEnabled:
// false on this route in AppNavigator.tsx) are both routed through the
// same "Back to Cart" reset rather than left to the default pop, for the
// same reason — an unhandled back here is exactly what re-exposed the
// stale-stack loop above.

import { useEffect } from 'react';
import { BackHandler, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentStatus'>;

// Same blue this whole checkout flow already uses for its one real accent
// (PaymentMethodList.tsx, PaymentProcessingScreen.tsx's own BRAND_ACCENT)
// — kept consistent here rather than introducing a second brand color for
// what's still part of the same payment journey.
const BRAND_ACCENT = '#155dfc';

export function PaymentStatusScreen({ navigation }: Props) {
  function retryPayment() {
    navigation.reset({ index: 1, routes: [{ name: 'Cart' }, { name: 'Checkout' }] });
  }

  function backToCart() {
    navigation.reset({ index: 0, routes: [{ name: 'Cart' }] });
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backToCart();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-8">
      <View className=" items-center justify-center">
        <View className="h-14 w-14 items-center justify-center">
          <AppIcon icon={Cancel01Icon} size={28} color={colors.danger} />
        </View>
      </View>

      <Text className="mt-2 text-[18px] font-semibold tracking-tight text-ink">Payment Not Confirmed</Text>
      <Text className="max-w-[300px] text-center text-[13.5px] font-medium leading-5 text-ink/55">
        Payment wasn’t confirmed. If charged, your money will be refunded within 2 hours. Check Orders before paying again.
      </Text>

      <View className="mt-8 w-full gap-3">
        <Pressable onPress={retryPayment} className="items-center rounded-2xl py-4" style={{ backgroundColor: BRAND_ACCENT }}>
          <Text className="text-[13.5px] font-semibold text-white">Retry Payment</Text>
        </Pressable>
        <Pressable onPress={backToCart} className="items-center rounded-2xl py-4 bg-[#F1F2F4]">
          <Text className="text-[13.5px] font-semibold text-ink/70">Back to Cart</Text>
        </Pressable>
      </View>
    </View>
  );
}
