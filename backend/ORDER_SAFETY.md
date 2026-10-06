# Store privacy, delivery proof and atomic financial effects

This change addresses the six requested P0 findings. Database permissions are activated by migrations; updating application files alone does not secure a deployed database.

## Responsibilities

| Component | Contract |
|---|---|
| `stores/publicStore.ts` + `storefronts` SQL view | Explicit public fields; new bank/KYC columns never join the storefront contract automatically |
| `orders/deliveryCodes.ts` | Customer-owned code projection and rider verification; no secret returned to a rider |
| Migration 079 | Private codes, secure random generation, expiry, five-attempt lock, serial verification, admin recovery audit and bounded cleanup |
| Migration 080 | Status changes plus refund intent/earnings in one transaction; private fenced refund queue and historical recovery |
| `payments/orderRefunds.ts` | Bounded, leased provider work; frozen amount/key, timeout reconciliation, retries and terminal review |
| Migration 081 | Combined refund backlog, single-order queue age/failure counts in the existing shared capacity sample |
| Worker jobs | Disjoint refund claims across replicas, five provider calls at a time, expired-code cleanup |
| Admin refund routes | Approve/retry durable work through SQL; no competing provider calls from Next |
| Logger options | Redact authorization/cookies, request URLs/bodies/query data, OTP and token fields |

## Store and account privacy

Store API list reads the public `storefronts` view and applies a second DTO allowlist. Anonymous/authenticated users lose table-wide and private-column SELECT permission on stores. The view uses caller RLS, so this does not create an elevated read bypass. Backend/admin service clients retain private access for their authorized routes.

The ownership UUID is granted to authenticated users only because existing participant RLS subqueries require it; it is excluded from the public view/DTO. Payout destinations, owner names, PAN/GST and other private merchant columns are excluded. FSSAI storefront information remains an intentional public field.

Migrations 069/071/078 already hardened auth-context grants. Migration 079 repeats the explicit PUBLIC/anon/authenticated revocation. Read-only verification checks every installed auth-context overload's effective execution permission.

## Delivery proof

`orders.delivery_otp` remains for compatibility but is always NULL. Existing active codes are migrated into a private table before clearing the old column. Customer detail/live/trip APIs project a code only after ownership validation, using a service-only bounded RPC. Assigned-rider direct reads, rider detail responses and status responses cannot reveal it.

Migration 079 creates the compatibility column when it is absent (for example, when legacy migration 049 was not applied). Active deliveries without a valid legacy code receive a new private code during migration; existing valid codes are preserved. CI runs both schema variants. If the original 079 failed on the missing column, rerun the complete corrected 079: its explicit transaction rolls back the failed attempt, and 078 does not need repeating.

Codes use operating-system-backed random UUID entropy, expire after two hours and lock after five wrong attempts. Failed attempts return a result rather than throwing a transaction-rolling-back exception, so the attempt count is durable. A trip shares one scope/code. Verification serializes that scope, locks the order and private code, and commits delivery plus its earning together. Retrying an already completed assigned delivery returns the same outcome without another earning.

Expired/locked code recovery is an authenticated backend admin action: `POST /admin/orders/:id/delivery-code/reissue`. SQL also verifies the actor's admin role and writes an audit event. The endpoint returns only acknowledgement; the customer reads the replacement code through their normal tracking API. No rider can reset their guessing limit. Expired code rows are pruned in bounded, disjoint batches after an extra day of retention.

## Financial invariants

* A paid single-order cancellation writes an immutable refund target/intent in the same transaction as status and stock release. If the intent insert fails, cancellation rolls back.
* Late single and trip captures also commit their refund intent in the settlement transaction; they do not depend on the HTTP process surviving to call a provider.
* Shared trip payments are never refunded as arbitrary gross shop subtotals. Authorized pre-pickup merchant/rider/admin cancellation uses coordinated whole-trip cancellation; blocked pickup states fail without a partial change.
* Single delivered/failed status and rider earnings commit together. Trip completion serializes the scope and inserts one combined earning only when all legs are delivered and rider assignments agree. Existing unique indexes prevent duplicates. Previously missing eligible earnings and cancelled-payment refund intents are recovered by migration 080.
* A claimed worker freezes request amount before contacting the provider. The database rejects later changes to that amount. Lost responses retry the same persisted key and body; they do not create a new financial operation.
* Provider lookup is paginated and validated. Pending refunds reserve money; only confirmed processed refunds count toward completion. Persisting worker progress and customer-visible refund status is atomic and lease-fenced.
* Timeout/409/server errors retain retryable intent with bounded backoff. Deterministic provider failures pause for review. Only a confirmed failed provider refund permits a new key when an admin retries; uncertain outcomes retain the old key/body.

Provider idempotency follows Razorpay's [normal refund idempotency contract](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md). Provider calls were mocked in validation; no real refunds were issued.

## Deployment order

1. Stage and test migrations through **078**, then **079**, **080**, **081** in order.
2. Coordinate the schema/backend rollout in a maintenance window. Old backend versions expecting plaintext order codes must be drained; do not leave them serving requests after migration 079. Existing mobile API shapes are preserved.
3. Deploy the updated backend **and separate worker**, plus the changed admin refund routes. Refund work stays durable if a worker is temporarily offline, but prompt processing requires a running worker and valid provider credentials.
4. Restart/drain old API instances so old public-response caches cannot retain the former store response. Install metrics scrapes/alerts; templates alone do not activate monitoring.
5. Run verification using a securely configured psql connection:

```sh
psql -X -v ON_ERROR_STOP=1 \
  -f backend/tests/sql/verify-commerce-security.sql \
  -f backend/tests/sql/verify-order-safety.sql
```

For Supabase's SQL editor, omit psql `\set` lines. Verification reads metadata and a boolean legacy-code check without printing customer secrets. Migration lock waits are bounded; retry during quieter traffic if a busy table prevents deployment. Do not restore public writes/secret reads as a rollback.

Review existing log retention/access separately: redaction protects future logs and does not erase previously stored headers. Historical financial recovery should be reviewed against any exceptional off-platform/manual settlements before production application.

## Validation and operations

CI runs real PostgreSQL permission/transaction tests, forced refund/earning failures, late captures, code locking/admin recovery, bounded metrics and concurrent trip completion/refund claims. Unit tests exercise redaction, public DTOs, provider timeout, reconciliation and stale lease behavior. Backend lint/TypeScript and admin TypeScript are required checks.

Monitor combined backlog, `flikk_database_order_refund_backlog`, `flikk_database_oldest_order_refund_seconds`, `flikk_database_order_refund_failed`, queue failures and provider errors. Prometheus alerts use max across replicas for these globally shared counts, not a sum that multiplies the same database queue.

This is not a throughput certification. Native customer/rider payment/delivery flows and Razorpay sandbox end-to-end tests remain release checks. Partial post-pickup trip failure/refund policies are a separate product/financial workflow; the existing API continues to reject unsupported partial failures rather than guessing allocations.
