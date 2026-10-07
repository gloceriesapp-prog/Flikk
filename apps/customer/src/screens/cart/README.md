# Cart payment and order placement

`payment/useCartPayment.ts` owns cart/address checks, server order creation and
payment flow. `components/CartPaymentBar.tsx` sits inside CartCheckoutFooter above the safe area:
one horizontal row shows the payment selector on the left and a compact
blue order button with the total on the right. Orders are placed directly
from the cart. No intermediate checkout
page is registered. Without a selection it opens the picker instead.

`../payment-method/PaymentMethodScreen.tsx` only selects a payment method.
Selecting a row returns to the existing Cart route with a serializable
`selectedPaymentMethod`; it never creates an order or initiates payment.
Back without selecting preserves the current method and cart. The original grouped payment layout, delivery address and total are retained on
that page. Rows end with selection arrows and never show Pay now buttons.
Payment rows live in that folder; the shared method model lives in
`../../payments/paymentMethod.ts`.

On entering the cart, installed UPI apps and the account's payment preference
load independently. Manual selection takes priority over a late preference
response. A remembered app that is no longer installed is not selected;
customers choose another method. Preference errors do not block selection.
Payments use Cashfree (`backend/PAYMENTS.md`). Only installed UPI apps are listed; a tapped app gets a Cashfree UPI intent (`POST /payments/upi/intent`) and is opened via `upiLaunchPlan` (Android: explicit package intent, then the default link; iOS: Cashfree's per-app link, then the app-scheme-swapped default link, then the default link), falling back to Cashfree checkout when nothing opens. UPI ID requires a server-verified VPA (`/payments/upi/validate`) and sends a collect request (`/payments/upi/collect`); the VPA lives only in navigation state, plus device-only SecureStore when the customer opts in. Cards/netbanking/other use the Cashfree SDK web checkout.

The backend's authenticated `/payments/preference` GET/PATCH endpoints store
only a method identifier in existing Supabase Auth user metadata. No schema
migration is needed. Existing customers without this metadata fall back to
their latest eligible order's COD/online method. PATCH checks ownership of
the order/trip and requires COD placement or a server-confirmed online
payment before saving. It does not authorize, charge or mark anything paid.

COD saves after order creation. Cashfree checkout saves after verification. UPI intent/collect
saves in PaymentProcessing after the existing webhook-backed poll confirms
payment. Failed/cancelled payment attempts never update the preference.
The persistence call is best effort and does not delay the success screen.
No card details, UPI ID, payment credentials or app icons are stored remotely.

An immediate ref lock prevents repeated Place order taps while React updates
the loading state. `quote/useCheckoutQuote.ts` loads the server bill; every
payable display uses it, including additional-shop pickups. Order creation
requires a signed quote and a fresh server check. Price/pack/fee changes require
explicit confirmation. Quote errors disable ordering, with a retry action.
Receipts and payment processing use the saved order/trip total. Tip controls
are hidden until collection and payout are complete. See
`backend/CHECKOUT_QUOTES.md` for the server contract and deployment dependency.

`quote/useCartAvailability.ts` checks every pack/shop against the selected saved
address. It refreshes while the cart is active and on return from background.
Unavailable cards show a status and Remove action, and ordering stays disabled.
`backend/CHECKOUT_ELIGIBILITY.md` documents the transactional stock lifecycle.

## Durable checkout recovery

Order/trip creation requires an account-scoped persisted attempt ID. Retries reuse that ID only after an uncertain outcome (network/timeout/5xx); a definitive rejection (out of stock, price/promo changed) or a changed cart closes the attempt atomically on the backend and starts a fresh one (`payment/attemptPolicy.ts`). The old cart is never replayed. Unpaid checkouts can be cancelled or switched to cash on delivery from Payment recovery (`POST /payments/abandon`). Payment recovery is implemented in `features/checkout-recovery/`, using backend discovery and provider reconciliation rather than navigation snapshots. See `backend/CHECKOUT_RECOVERY.md` for migration/release requirements.
