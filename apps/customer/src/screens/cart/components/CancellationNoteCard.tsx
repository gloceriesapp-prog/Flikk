// Sits below BillDetailsCard on CartScreen — a plain-language heads-up
// on this app's real cancellation window, not a stray UI note. It
// mirrors real backend behavior: backend/src/lib/orderStateMachine.ts's
// ALLOWED_TRANSITIONS allows 'cancelled' from both 'placed' AND 'packed'
// — a packed order can still be cancelled/refunded, it's only once an
// order moves to 'out_for_delivery' (a rider already has it) that
// cancellation is no longer reachable. TRANSITION_OWNER also means only
// 'store_owner'/'admin' can make that move — 'customer' isn't in that
// list at any stage, so there's no self-serve cancel button in this app;
// a customer goes through support instead. If either of those tables
// ever changes, this copy needs to change with it.
//
// No mention of a cancellation fee — deliberately, unlike some reference
// copy this was checked against. Nothing in this app's order state
// machine or refund path charges one; saying otherwise here would be
// describing a policy that doesn't actually exist in the code.

import { Text, View } from 'react-native';

export function CancellationNoteCard() {
  return (
    <View className="gap-1.5 rounded-2xl bg-white px-4 py-4">
      <Text className="text-[15px] font-semibold text-ink">Cancellation Policy</Text>
      <Text className="text-[13px] leading-[19px] text-ink/60 font-medium">
        Free to cancel or refund until a rider picks up your order. Once it&apos;s out for delivery, it can&apos;t be
        reversed — contact support to cancel.
      </Text>
    </View>
  );
}
