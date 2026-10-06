# Checkout pricing contract

POST /checkout/quote requires an authenticated customer and `{ items, address_id, promo_code? }`.
Items contain actual `product_id`, optional `variant_id`, quantity, and optional
expected unit price. The quote returns current database pack prices and MRP,
pack labels, quantities, store count, item total, base delivery fee, additional
shop pickup fee, combined delivery fee, handling fee, coupon discount and total.
The ₹15 fee applies once per additional shop. Existing free-delivery eligibility
waives the whole delivery fee, including pickups; handling remains payable.

The shared service calculates quotes and both single-shop and multi-shop order
creation. A five-minute HMAC token binds the customer to the exact bill, coupon
and canonical product lines. All instances use the configured backend service
key with a dedicated signing domain; secrets never enter the quote response.
No quote table or process-local quote cache is needed. Eligibility and inventory protection require migrations 062 and 063. A changed fee,
quantity, product price, pack or coupon invalidates the quote, even when the
final total happens to stay equal. This is a short-lived consent snapshot,
not an inventory reservation or a guarantee that an unavailable pack can ship.

POST /orders and POST /trips now require `quote_token`. They reload current
catalogue/settings/promo state, compare the signed snapshot before creating an
order, and never trust submitted totals. `QUOTE_CHANGED` (409) requires reviewing
and confirming a new quote. The migration 062 trigger separately locks and
validates pack prices and availability during insertion; a concurrent product
edit aborts creation atomically. Order/trip totals and order-item snapshots feed
existing payment intents, receipts and historical order summaries.

Deploy migrations 062 and 063, then this backend and the matching
customer build together. Older customer builds cannot order without a quote.
Migrations 062 and 063 remain pending approval in the current workspace; its readiness
guard intentionally blocks quotes/placement until snapshots and transactional eligibility are available.
See CHECKOUT_ELIGIBILITY.md for the stock and eligibility contract.

Customer query keys include the account session, cart packs/quantities and
coupon. Quotes refresh on focus, cart/coupon changes and every minute while
active. A failed quote has no fallback payable amount; ordering is disabled
until a quote succeeds. Place order fetches a fresh quote and asks for explicit
confirmation if saved cart prices/pack sizes differ or the displayed bill changed.
Cancelling creates no order and starts no payment. A changed cart, address or
payment selection while waiting cancels that attempt. Server changes after
confirmation return 409; customers review and submit again.

The cart bill, payment button and payment-method amount display consume quotes.
After creation, payment-processing/receipt amounts use the saved server total,
and receipt products use the selected pack details from the confirmed quote.
Razorpay/UPI intent creation already reads the saved order/trip total server-side.
Rider tip selection, custom-tip controls and tip bill rows are hidden until
collection, storage and rider payout work end to end. The backend rejects
nonzero tip fields rather than silently ignoring them. Rider delivery earnings
and existing payout calculations remain unchanged.

Validation: `npm test` and `npx tsc --noEmit` in backend; customer TypeScript and
focused lint. Quote tests cover extra shops, two variants at one shop, free
shipping, decimal prices, stale/tampered/expired/customer-bound tokens, fee,
price, pack and coupon changes, pack presentation and the API request body.
