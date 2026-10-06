# Customer checkout audit follow-up

This follows the 23-step audit supplied on 5 October 2026. Findings were traced through the current implementation rather than assumed to still match older code.

| Step | Current implementation and disposition |
| --- | --- |
| Launch | Secure storage failures produce a retry state. Auth hydration precedes owner-scoped cart hydration; legacy unowned drafts and stale account responses are discarded. Tests cover storage rejection and account changes. |
| Authentication | Access/refresh tokens are persisted atomically in one secure record. Logout writes a tombstone before obsolete-key cleanup; if secure storage fails, a retry gate keeps the account hidden. A new login identity is published only after its secure record is saved. Refresh network outages preserve the session. Auth-context functions remain service-only under migration 078. |
| Location | Public proxy inputs are validated. Per-IP admission and provider-call budgets use shared PostgreSQL counters; cached/coalesced responses do not spend another provider quota. Provider, GPS and native geocoder waits have deadlines. Old search/pin results cannot overwrite the current pin. Native permission behavior still requires device validation. |
| Addresses | Migration 082 serializes operations on the customer row and enforces one active default with a partial unique index. |
| Home | Coverage comes from the nearest-store result; first-load connection failure has a retry state. Assortments use the selected address. |
| Search | Migration 084 provides indexed ranking, synonyms, basic typo similarity and cursor pages. Search distinguishes request failures from empty results. Inventory changes invalidate the newer browse cache routes too. |
| Category | Server-filtered cursor pages and full-assortment facets replace page-derived filters. Unsupported mock categories do not become purchasable catalogues. |
| Product | Real variants only. Unknown/depleted packs cannot be selected for purchase. Product-sheet state follows product identity when neighbours arrive asynchronously; the render/effect lint errors are fixed. |
| Cart | Local drafts remain non-authoritative. Server quotes and transactional availability decide whether an order can proceed. Late payment success clears only the purchased draft, preserving newer edits. Cart synchronization across devices is not implemented. |
| Bill | Server quote is used for pricing, discounts, handling/delivery/extra-shop fees and payment. HTTP deadlines cover request and response-body reads. Unreadable successful responses remain uncertain rather than being treated as confirmed orders. |
| Coupon | Migration 083 locks and validates promotion eligibility/cap/expiry/amount during order insertion. Unpaid abandoned promotions are released transactionally. |
| Address revalidation | Customer ownership, pin, zone, shop/product approval, opening hours and radius remain enforced on the backend and inside final order creation. |
| Payment choice | Saved preference returns to the cart; provider confirmation remains backend-owned. Native UPI/card behavior requires real development/release builds. |
| Attempt creation | Persisted attempt ID precedes the order request; server attempts replay one result. Local read/check/delete/save operations are serialized and account-bound. Corrupt attempts cannot silently create a replacement. Direct customer order insert permission remains revoked under 078. |
| Provider payment | Existing backend signatures, ownership, captured amount and reconciliation remain authoritative. Lost/unreadable responses retain the attempt. Native callbacks cannot continue payment under a different account. |
| Confirmation | Matching committed attempts alone are cleaned up. A delayed successful payment cannot remove a newer attempt or edited cart. Restart recovery reads backend state. |
| Tracking | Uses focused/foreground lightweight live polling, retained static details, explicit error states and terminal stop. Detail-refresh effects now depend on stable observer fields. Rider delivery codes remain hidden. |
| Delivery | Migration 079 verifies private OTPs; 080 records earnings atomically with status; 086 coordinates terminal trip failure and refund review. |
| Cancellation | Single paid cancellation creates its durable refund intent in the status transaction through 080. Trip cancellation remains coordinated. Merchant/admin status updates use the same database effects. |
| Refund | Durable single/trip intents, worker claims and customer history exist; provider recovery is independent of the HTTP response. |
| History | Account-scoped cursor pages and lightweight status updates remain. The 30-day filter clock is captured outside render, fixing its lint error. Development samples are not release evidence. |
| Summary | Shares lightweight tracking rather than repeated full joins. 083 snapshots product names/images; **087 snapshots delivery address/contact/pin for new orders and trips**. Historical snapshots cannot be reconstructed reliably. |
| Reorder | Ranking scans at most the latest 100 delivered orders. Returned products are now additionally scoped to the current delivery address and current stock. |

## Deploy and configure

Migrations 078–086 were verified on the live database in the preceding check. **Apply 087 before deploying this backend version**; this task tests it locally and does not execute a production schema change.

`TRUST_PROXY_HOPS` must match the actual trusted reverse proxy topology. `MAPS_PROVIDER_REQUESTS_PER_MINUTE` defaults to 400, accepts 1–500, and should be set to the purchased provider quota. It is a shared provider-call budget across replicas, separate from the 90/minute per-IP admission budget. Throttle counters contain keyed hashes, not raw IPs, phone numbers or address text. Provider deadlines are eight seconds; shared customer HTTP calls have a twenty-second deadline.

Authentication upgrades read old paired SecureStore keys only when no v2 record exists. Subsequent successful writes migrate to the atomic record and remove the old keys. A v2 logout tombstone always takes precedence over undeleted old credentials.

## Release evidence still required

Automated tests cover request deadlines, refresh outages, atomic secure writes/logout, stale account/pin responses, attempt races, receipt projection, cache invalidation and database snapshot immutability. They do not replace these device/provider tests:

1. iOS and Android: deny permission, approximate permission, disabled GPS, slow/no geocoder, manual pin movement while reverse geocoding is in flight.
2. Both accounts on one device: cold start, logout during storage/network/native payment work, then log into the other account.
3. Real payment provider: UPI app return, cancellation, lost confirmation response, process kill/restart, delayed webhook and reconciliation before another payment attempt.
4. Order/trip: delivery proof, cancellation at pickup boundary, refund retry and mixed terminal shop legs.

Production capacity is validated through sustained workload measurements, not inferred from code or passing unit tests. Device-local cart drafts are a stated behavior; no cloud-cart synchronization claim is made.
