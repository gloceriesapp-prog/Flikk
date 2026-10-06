# Customer care and refund visibility

## Entry points and screens

Profile Support, Help & Support, and tracking's support button open the same support flow. Tracking preselects the order/trip. Missing items, damaged products, payment/refund problems and delivery issues require an owned order; general questions can be sent without one. The screen also lists existing conversations and lets customers reopen a resolved case by replying. Profile My Refunds opens history, then details, status updates, order summary and a prefilled payment-support request.

Customer code lives in `apps/customer/src/features/customer-care/`, with API contracts, foreground/focus-aware queries, presentation helpers, shared layout and separate screens. Guest users see a sign-in prompt. Queries are scoped by account subject (never the token), retain loaded information during transient failures, hide cached information after definitive access/not-found errors, poll every 15 seconds only while visible, and use bounded pages of 25. Existing conversation messages remain visible when a new page arrives during polling. Customer forms lock duplicate taps and preserve request IDs and bodies for an uncertain submission retry; the server additionally deduplicates active issues after an app restart. Message IDs are retained in memory during retry, not persisted across a process restart.

## APIs and authorization

Customer endpoints, all requiring the customer role:

- `GET /support/request-id`: a new submission UUID.
- `GET /support/orders`, `GET /support/tickets`: owned order choices and cases.
- `POST /support/tickets`: request ID, one optional order/trip target, category and details (10–2000 characters).
- `GET /support/tickets/:id`: owned ticket and paginated messages.
- `POST /support/tickets/:id/messages`: request ID and text (1–2000 characters).
- `GET /customer-refunds`, `GET /customer-refunds/:kind/:id`: owned refund summaries and recorded updates.

List/thread/update reads accept an offset, with a 25-row page and maximum offset 5000. Responses expose no provider secrets, customer phone details or private admin identities. Ownership checks precede message/update reads. Ticket creation verifies ownership inside its transaction, serializes by customer, deduplicates active category/target cases (adding new details to their conversation) and immutable request replays through a separate request ledger (even when a request reused an active case), and limits new cases to 20 per day and creation submissions to 200 per day. Replies lock the ticket, check the actual actor role and ownership, deduplicate immutable request IDs, and allow at most 10 messages per actor per minute. Customer requests cannot change case status directly. Reopening a resolved case cannot create a second active case for the same issue.

## Admin handling

`/support` in the admin sidebar and Help Center provides the working inbox and conversation view. `/api/support` and `/api/support/:id` validate both the authenticated session **and the database admin role**. Replies and Open/In progress/Resolved status changes commit together through `reply_support_ticket`. Replies remain plain text. A lost response retries the same ID and body. Resolving a support case does not initiate a refund; money movements remain in the existing protected payment/refund workflows. There is no fabricated support phone, email or response-time promise.

## Refund history

Migration 066 adds append-only status updates through database triggers. Existing single-order refunds use their saved order amount/reason; coordinated trip refunds use their saved total, including discounts and fees. The history view suppresses per-shop duplicate summaries when the combined trip refund exists. Trigger writes only occur on actual status changes, so polling/repeated updates do not manufacture events. Historical refunds remain visible, but unknown initiation/update times are not invented.

The destination currently says **Original payment method**: existing payment records do not reliably store verified bank/card destination details. It means the method used to pay, not a wallet credit or a new account chosen by the customer. Provider account numbers are never guessed. Live provider settlement still comes from the signed refund webhook (orders) or the durable worker (trips). No ticket endpoint changes prices, refunds or payment status.

## Deployment and validation

Apply `066_customer_support_refunds.sql` after pending migrations 062–065 before deploying these screens/routes. Shared database changes were not made during this task. Service-role-only tables, view and RPC grants prevent bypassing the API. SQL tests in `tests/sql/customer-support.sql` cover ownership, immutable replay, active-case deduplication, authorization, admin resolution, customer reopening, precise order/trip amounts, status histories and public-role denial. Unit tests cover contract validation and error mapping. Native app layout and real admin/customer conversations need a deployed migration and end-to-end smoke test.
