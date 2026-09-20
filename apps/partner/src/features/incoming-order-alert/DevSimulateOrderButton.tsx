// Dev-only trigger for previewing IncomingOrderAlert (the full-screen
// "New Order Received!" interrupt + its sound) without needing a real
// customer to place a real order. Rendered inline in OrdersScreen, right
// below StoreProfileHeader — not a floating overlay (that placement sat
// under other absolutely-positioned elements and was unreachable to tap).
//
// Calls useOrdersStore.simulateIncomingOrder(), which fires the exact
// real production trigger (injects a fake order into `orders` AND
// newlyArrivedOrderIds together) rather than rendering some separate mock
// of the alert — what you see here is guaranteed to be what a real
// incoming order actually looks and sounds like, never a screen that can
// drift out of sync with it.
//
// __DEV__ is a real React Native global (true in a Metro dev build, false
// in a release build) — this button, and the code path it calls, can
// never appear in a build a real shop owner installs.

import { Pressable, Text } from 'react-native';
import { useOrdersStore } from '../../store/useOrdersStore';

export function DevSimulateOrderButton() {
  const simulateIncomingOrder = useOrdersStore((state) => state.simulateIncomingOrder);

  if (!__DEV__) return null;

  return (
    <Pressable
      onPress={simulateIncomingOrder}
      className="mx-5 mt-2 items-center justify-center rounded-2xl bg-ink py-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Text className="text-sm font-bold text-white">Simulate order</Text>
    </Pressable>
  );
}
