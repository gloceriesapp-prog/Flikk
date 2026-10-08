# Cross-app audit findings 58–61

## Storage and authorization

All new operational tables are private: store memberships, rider change requests and customer app feedback are available only to backend/admin service clients. Public apps send authenticated requests; they never receive a service key. Rider document uploads remain private Supabase objects and the review UI receives short-lived signed URLs. Store push readiness exposes a boolean, never the push token.

A store has one primary owner and up to 20 active managers. An administrator adds existing accounts by phone. Managers have operational store access; payout and legal-document controls remain owner-only. Removing membership is checked on the next API request. Assigning a rider, administrator or another store’s owner is refused. Customer identity is never inferred from request bodies.

Approved riders submit a bounded document/vehicle change request. Existing approved values stay in use until an administrator approves it. The review and profile update commit together; repeated decisions are idempotent, conflicting decisions fail. Rider zones come from the database. Existing release/maintenance controls remain the source of truth.

## Customer behavior

Promo codes have an optional start date and a per-customer quota (default one use). Validation provides feedback, while the transactional redemption trigger enforces time, quota and price. Existing codes retain their previous policy unless edited.

Every app rating from one to five is saved. App-store review is optional for every score. Authenticated customers can opt in to an area waitlist; legacy anonymous votes have no contactable account. Admin sends launch announcements in batches of at most 100. Durable notification rows and the worker handle retries; area notification taps open the inbox after ownership validation, including cold starts.

The free-delivery card appears only when the policy is enabled. It uses the quote’s item total and reflects the actual backend delivery waiver. Handling fees remain separate.

Online checkout hold and reconciliation grace are admin settings. Deadlines are snapshotted on the checkout, shared by multi-shop legs, and immutable thereafter. Cashfree’s minimum allowed expiry does not extend the stock reservation: late captures still follow the existing settlement/refund rules. The payment screen’s short reconciliation polling budget is separate from the reservation deadline.

Public content changes invalidate the relevant server caches and emit content/config events. Apps share one observer per QueryClient, avoiding duplicate invalidations and retaining account boundaries. Realtime failure recovery refreshes those caches; the new migration publishes the missing admin-editable tables.

## Admin behavior

Login destinations are normalized local paths. Support and new administrative routes use the same verified-session/email allowlist. Approval failures are visible inline. Failed/unknown statuses have readable labels. Customer search sanitization is covered by a regression test, including commas and Unicode.

## Rollout

1. Verify the existing migration baseline against the target database. The migration history may omit SQL that was applied manually; do not infer missing schema solely from that ledger.
2. Apply the three new migrations in manifest order: rider reviewed changes, store team access, customer policy/content sync. Deploy migrations before the backend and dashboards that reference their columns.
3. Deploy backend and worker together, then admin/partner dashboard and mobile builds.
4. Confirm publication membership and realtime connection health. Exercise owner/manager removal, private document review, promo limits, launch notification taps and delayed payment recovery on test accounts.
5. Run physical Android/iOS checks before production promotion. Automated tests do not verify real push delivery, store permissions on a device or Cashfree settlement in a live merchant account.

## Regression checks

The canonical migration manifest includes content checksums. Fresh-bootstrap tests require a disposable PostgreSQL 17 database named `flikk_migrations_tests` and refuse another database. SQL scenario tests wrap fixtures in transactions and roll them back. See `backend/tests/sql/customer-policy-sync.sql`, `rider-profile-changes.sql` and the store-team fixture for permissions and state transitions. Backend Vitest, mobile typechecks and admin redirect/search tests cover the application boundary.
