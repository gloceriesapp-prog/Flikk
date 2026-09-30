// Thin wrapper around RazorpayCheckout.open() — the real native Checkout
// UI (react-native-razorpay, requires the EAS dev-client build this app
// now ships, see app.json's own bundleIdentifier/package additions). This
// single call is what actually gives a customer every method category
// Razorpay supports: UPI (Intent — jumps straight into an installed app
// like Google Pay/PhonePe via Android intent / iOS URL scheme; Collect —
// type a UPI id, approve from a notification; QR — scan-to-pay fallback),
// cards, netbanking, wallets, card EMI/cardless EMI, and Pay Later. None
// of these are hand-built here — Razorpay's own SDK detects what's usable
// on the device and presents it, same as Blinkit/Instamart's own checkout
// (this app's own explicit note on how those apps actually integrate).
//
// COD never reaches this function at all — CheckoutScreen only calls this
// for the "pay online" path; Cash on Delivery is handled entirely outside
// Razorpay (see that screen's own handlePay).
//
// The import below is deliberately lazy (inside the function, not a
// top-level `import`) — react-native-razorpay's native binding
// (TurboModuleRegistry.getEnforcing) throws the instant its module is
// required, not just when .open() is called. A top-level import gets
// required the moment CheckoutScreen.tsx enters the bundle graph (Android
// Navigation eager-imports every screen), which crashes the ENTIRE app on
// launch in plain Expo Go (no linked native module there) — not just this
// one screen. Lazy-requiring it here defers that same throw to the one
// moment it's actually needed (tapping "Pay Now" on cards/UPI-collect/
// netbanking), where it's already caught below and shown as a normal
// error instead of a boot-time crash. Real UPI Intent (payments/
// upiIntent.ts) doesn't touch this file at all — that path still fully
// works in Expo Go.
import type { RazorpayCheckoutSuccess } from 'react-native-razorpay';
import { colors } from '../theme/tokens';

export interface OpenCheckoutInput {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  contact: string | null;
  name: string | null;
}

// Rethrows react-native-razorpay's own {code, description} shape as a
// plain Error with a message a screen can show directly — a cancelled
// checkout (the customer backing out) and a genuine failure both reject
// the same way here, CheckoutScreen treats them identically (no order
// gets marked paid either way, nothing to distinguish for the UI).
export async function openRazorpayCheckout(input: OpenCheckoutInput): Promise<RazorpayCheckoutSuccess> {
  try {
    const { default: RazorpayCheckout } = await import('react-native-razorpay');
    return await RazorpayCheckout.open({
      key: input.keyId,
      amount: input.amountPaise,
      currency: 'INR',
      order_id: input.razorpayOrderId,
      name: 'Gloceries',
      description: 'Order payment',
      prefill: {
        contact: input.contact ?? undefined,
        name: input.name ?? undefined,
      },
      theme: { color: colors.limeDeep },
    });
  } catch (err) {
    // TurboModuleRegistry's own error text when the native module isn't
    // linked (plain Expo Go, no dev-client build) — a distinct, expected
    // case worth a clear message instead of Razorpay's generic fallback.
    if (err instanceof Error && /TurboModule|native module/i.test(err.message)) {
      throw new Error('Card/UPI-collect/netbanking checkout needs the real dev-client build — not available in plain Expo Go.');
    }
    const razorpayErr = err as { description?: string } | undefined;
    throw new Error(razorpayErr?.description ?? 'Payment was not completed.');
  }
}
