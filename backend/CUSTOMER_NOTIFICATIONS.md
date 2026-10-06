# Customer inbox and durable notifications

Deploy `migrations/067_customer_notifications.sql` before enabling the new notification endpoints in a release. The migration has been tested in the isolated fixture; shared-database deployment requires approval. No historical backfill is performed: the inbox records future order transitions.

Order changes insert inbox/outbox rows in the same transaction. `(order_id,event)` deduplicates retries, and unpaid online orders do not send a placed notification until payment capture. Direct cancellation and expiry also use this trigger, rather than relying on a particular HTTP route. Multi-shop notifications carry the trip ID and open combined tracking.

GET `/notifications?before=<cursor>` uses customer ownership, indexed keyset pagination and at most 25 entries. PATCH `/:id/read` checks ownership. Native device registration uses POST `/devices` with installation ID, push token and revision; DELETE `/devices/:id?revision=<n>` detaches only the caller's device. Tables/functions are not exposed to anon/authenticated database roles. Customers use these endpoints instead of legacy `/auth/push-token`; partner/rider registration is unchanged.

The worker claims 50 rows every 30 seconds with `SKIP LOCKED` and five-minute leases. Multiple backend instances can process disjoint claims. Provider requests are bounded to five in parallel, max 100 messages/request, with 15-second timeouts, exponential backoff and six attempts. Rejected DeviceNotRegistered tokens are removed for their owner. Provider acceptance is recorded separately from customer read state. A missing migration pauses worker attempts for five minutes with an explicit warning.

Push delivery is at least once: a process crash after provider acceptance or partial failure may duplicate an OS alert. Expo tickets confirm acceptance, not final APNs/FCM delivery; receipt reconciliation is not implemented. The inbox remains the durable source of updates. Alert on exhausted jobs (`push_sent_at is null and attempts >= 6`) and growing due-queue age. Size worker replica count against measured notification throughput; this change does not establish a 10k–50k-user capacity guarantee.

Device registration locks only the affected installation, token and customer, in a consistent order. Monotonic revisions and a conditional upsert protect logout/account changes from delayed writes. Ten active devices per customer bounds notification fan-out. Apply API gateway rate limits to authenticated inbox/device routes as part of deployment.

Validation: backend notification contract/worker tests; two-account customer API/cache tests; `tests/sql/customer-notifications.sql` against the isolated `flikk_checkout_tests` fixture. Native two-account and killed-app tests are documented under the customer feature READMEs and remain required before release.
