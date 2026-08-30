// Central place for every payment-method icon this app shows (Checkout's
// PaymentMethodList right now, anywhere else that lists payment methods
// later). Icons8 CDN URLs for now — swap any entry to a bundled/real brand
// asset later without touching the screens that render them, since they
// all read from PAYMENT_METHOD_ICON_URL by id instead of hardcoding a URL
// inline. Leave a method's value `null` (with a comment why) rather than
// guessing a URL — a wrong/borrowed icon is worse than falling back to the
// generic in-app icon a screen already renders.
//
// To add or swap an icon: change the URL here only, nothing else.

import type { PaymentMethod } from '../screens/checkout/components/PaymentMethodList';

export const PAYMENT_METHOD_ICON_URL: Record<PaymentMethod, string | null> = {
  cod: 'https://img.icons8.com/fluency/48/money.png',
  google_pay: 'https://img.icons8.com/color/48/google-pay.png',
  phonepe: 'https://img.icons8.com/color/48/phone-pe.png',
  // Placeholder — same URL as phonepe (as given), pending a real UPI/BHIM
  // mark to replace it with.
  upi_id: 'https://img.icons8.com/color/48/phone-pe.png',
  // Not supplied yet — falls back to the in-app wallet icon until given.
  amazon_pay: null,
};
