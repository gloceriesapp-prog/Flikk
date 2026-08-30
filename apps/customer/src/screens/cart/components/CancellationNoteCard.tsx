// Sits below BillDetailsCard on CartScreen — a plain-language heads-up
// on this app's real cancellation window. This isn't a stray UI note; it
// mirrors real backend behavior: backend/src/lib/orderStateMachine.ts's
// ALLOWED_TRANSITIONS allows 'cancelled' from both 'placed' AND 'packed'
// — a packed order can still be cancelled/refunded, it's only once an
// order moves to 'out_for_delivery' (a rider already has it) that
// cancelled/[]  is no longer reachable. TRANSITION_OWNER also means only
// 'store_owner'/'admin' can make that move — 'customer' isn't in that
// list at any stage, so there's no self-serve cancel button in this app;
// a customer has to go through support instead. If either of those tables
// ever changes, this copy needs to change with it.
//
// "Read cancellation policy" is a real tap target, not a dead link — no
// dedicated policy screen exists yet, so it opens the same facts as a
// native Alert instead of linking nowhere or half-building a screen for
// a few sentences of text.

import { Alert, Pressable, Text, View } from 'react-native';

const POLICY_BODY =
  "You can still get an order cancelled or refunded through support even after the store has packed it. Once a rider picks it up for delivery, though, it's already on its way and can't be reversed — so that's the real cutoff to keep in mind.";

export function CancellationNoteCard() {
  return (
    <View className="gap-2 rounded-2xl bg-white px-4 py-3.5">
      <Text className="text-[14px] leading-[19px] text-ink/60">
        <Text className="font-medium text-danger">Note: </Text>
        Need to cancel or get a refund? That's possible right up until a rider picks up your order for delivery, just reach out to support.
      </Text>

      <Pressable onPress={() => Alert.alert('Cancellation policy', POLICY_BODY)} hitSlop={6}>
        <Text className="text-[13px] font-medium underline" style={{ color: '#155DFC' }}>
          Read cancellation policy
        </Text>
      </Pressable>
    </View>
  );
}
