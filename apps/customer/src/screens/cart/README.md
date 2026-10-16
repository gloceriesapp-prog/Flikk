# Cart payment and order placement

`payment/useCartPayment.ts` owns cart/address checks, server order creation and
payment flow. `components/CartPaymentBar.tsx` sits inside CartCheckoutFooter above the safe area:
one horizontal row shows the payment selector on the left and a compact
blue order button with the total on the right. Orders are placed directly
from the cart. No intermediate checkout
page is registered. Without a selection it opens the picker instead.

`../payment-method/PaymentMethodScreen.tsx` returns a serializable payment
selection to the existing Cart route. An explicit Android UPI app selection
also requests one checkout through `payment/usePaymentSelectionStart.ts`.
Cart consumes that request before asynchronous work, waits for eligibility and
quote checks, and retains its existing price-change confirmation. Rerenders or
foregrounding cannot replay the request. Profile selections only save a
preference; other payment methods return to Cart for confirmation.

On entering the cart, installed UPI apps and the account's payment preference
load independently. Manual selection takes priority over a late preference
response. A remembered app that is no longer installed is not selected;
customers choose another method. Preference errors do not block selection.
Android installed UPI app rows use Razorpay S2S intent. The authenticated
backend `/payments/upi-intent` endpoint derives ownership, amount and contact
from persisted data, atomically claims the attempt, and creates or reuses one
provider payment. The app launches the exact provider URI with the selected
Android package through the native `UpiApps` module. It never rewrites payment
parameters. A real receipt email is required before creating an order for this
flow; synthetic phone-login email addresses are rejected. Contacts are stored
privately through `/payments/contact`.

Direct UPI requires Razorpay live keys, including on a local backend. Test-mode
mock payees are not valid bank UPI IDs. `/payments/availability.upi_intent`
advertises readiness and the server rejects test-mode intent requests before
creating provider orders or claims. Use the test checkout simulator for mock
payments. Never rewrite a provider payee to bypass Google Pay validation.

Cards, netbanking and other online options retain the official
`react-native-razorpay` Standard Checkout. Direct S2S UPI is Android-only;
other platforms show an explicit unsupported message. No provider secret is
bundled. Apply backend migrations `20261014061458` and `20261014093324` before
deploying this flow. The latter caches a short-lived verified resume decision;
launching still rechecks provider state on the server.

SDK callbacks are sent to `/payments/verify`; the backend checks signature,
ownership, captured state, currency and amount. A callback alone never clears
the cart or shows a successful receipt. Network errors and cancellation route
to reconciliation for the same saved order. Native checkout prevents automatic
foreground recovery from navigating underneath the SDK. Processing uses a
wall-clock deadline capped by reservation expiry; background time counts, and
returning to the foreground refreshes the countdown and status immediately.
Unmounting stops polling. The backend reservation is the authority, even when
mobile operating systems suspend JavaScript timers.

The backend's authenticated `/payments/preference` GET/PATCH endpoints store
only a method identifier in existing Supabase Auth user metadata. No schema
migration is needed. Existing customers without this metadata fall back to
their latest eligible order's COD/online method. PATCH checks ownership of
the order/trip and requires COD placement or a server-confirmed online
payment before saving. It does not authorize, charge or mark anything paid.

COD saves after order creation. Online payment saves only after server verification
or backend recovery confirms capture. Failed/cancelled payment attempts never update the preference.
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

Order/trip creation requires an account-scoped persisted attempt ID. Retries reuse that ID only after an uncertain outcome (network/timeout/5xx); a definitive rejection (out of stock, price/promo changed) or a changed cart closes the attempt atomically on the backend and starts a fresh one (`payment/attemptPolicy.ts`). The old cart is never replayed. Unpaid checkouts can be cancelled or switched to cash on delivery from the recovered payment chooser (`POST /payments/abandon`). Recovery briefly reconciles backend state and opens the existing Choose how to pay screen; it does not show an extra saved-order page. Payment recovery is implemented in `features/checkout-recovery/`, using backend discovery and provider reconciliation rather than navigation snapshots. See `backend/CHECKOUT_RECOVERY.md` for migration/release requirements.

## Native rollout and device checks

App version/runtime `1.0.3` separates the new native gateway from existing
internal-test binaries. Build and install a new Android/iOS binary (EAS
prebuild/autolinking); this change cannot be delivered as an OTA update and
Expo Go cannot execute native checkout. The public environment no longer
selects a gateway mode: the backend key determines test/live mode.

Before releasing: use Razorpay test credentials and test success, decline,
cancel, expired reservation, network loss, app background/return, app kill
and relaunch, repeated checkout taps, and multi-shop recovery. For live rollout,
verify backend webhook configuration and key environment, then perform a
controlled merchant-approved device transaction. No automated live charge is
part of this test suite. UPI installed apps, real bank redirects, native return
callbacks and SDK compatibility require physical Android/iOS builds.

`patches/react-native-razorpay+3.0.0.patch` adds the namespace required by
AGP 8 and removes the obsolete manifest package attribute. It also emits
launch errors when Android has no activity or cannot open checkout, and
handles a null payment error payload. The upstream wrapper otherwise leaves
those errors unresolved. Keep this narrow compatibility patch until an
upstream SDK version fixes the same cases; re-run native builds when upgrading.
