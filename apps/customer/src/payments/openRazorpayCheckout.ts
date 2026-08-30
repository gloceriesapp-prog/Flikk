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

import RazorpayCheckout, { type RazorpayCheckoutSuccess } from 'react-native-razorpay';
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
    return await RazorpayCheckout.open({
      key: input.keyId,
      amount: input.amountPaise,
      currency: 'INR',
      order_id: input.razorpayOrderId,
      name: 'Flikk',
      description: 'Order payment',
      prefill: {
        contact: input.contact ?? undefined,
        name: input.name ?? undefined,
      },
      theme: { color: colors.limeDeep },
    });
  } catch (err) {
    const razorpayErr = err as { description?: string } | undefined;
    throw new Error(razorpayErr?.description ?? 'Payment was not completed.');
  }
}
