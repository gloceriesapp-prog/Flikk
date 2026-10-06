# Indexed discovery and durable background workers

## Store discovery

Apply migration 074. On a busy production database, stage index creation
with an online/concurrent index deployment plan to avoid blocking writes. `/stores/nearest` and `/stores/serviceability` call the
private `nearby_customer_stores` RPC. PostgreSQL's built-in GiST point index
filters a geographic bounding box, including antimeridian and polar cases.
An index-backed maximum radius for the selected zone determines the candidate
box. Exact haversine distance (6371km sphere, matching checkout) then applies
each store's own reach before ranking and limiting to 1–20 stores. This avoids
transferring an entire zone into Node or sorting it there. Missing coordinates
are excluded, closed shops remain discoverable, and ties use store ID.
Discovery returns a public-field allowlist, excluding payout configuration.

Coordinates are validated and remain exact. Response cache keys normalize
numerically equivalent coordinate strings and share concurrent identical
reads; distinct nearby addresses are deliberately not rounded into one result.
That could falsely change delivery eligibility at a radius boundary. The cache
is bounded, short-lived and invalidated by store changes on each API replica.
This is per-process caching, not a distributed geographic cache. The spatial
index is the reusable database structure across addresses; dense local store
coverage still requires a query-plan/load test. A missing RPC fails rather
than reverting to a full-zone read.

## Deployment: API and worker are separate processes

Apply migrations 075 and 076 before deploying the current worker. API instances keep their
realtime/cache subscriptions but start **no scheduled jobs**.

- Development API: `npm run dev`
- Development worker, separate terminal: `npm run dev:worker`
- Build: `npm run build`
- Production API: `npm start`
- Production worker: `npm run start:worker`

Both processes use the existing backend environment variables. Keep at least
one worker running continuously. Add worker replicas for throughput/isolation;
API replica count does not change scheduler count. Stop legacy API versions
that still start cron jobs before enabling new workers. Migration and code must
roll out together; this is not a safe mixed-version financial-job deployment.
No new worker has been started against the shared database by this change.
Worker startup checks its durable schedule schema before announcing readiness.

## Coordination, crash recovery and guarantees

After migration 076, the database owns three singleton schedules; expiry is a continuously drained item-claimed queue. Workers poll with jitter and claim one due
job using `FOR UPDATE SKIP LOCKED`. A job has a random lease token, two-minute
expiry and 30-second heartbeat. Renewals/completion require an unexpired token.
The worker stops guarded side effects on ownership loss. A process killed
mid-run leaves recoverable work; another worker can claim it after expiry.
Retries use backoff and preserve the original scheduled timestamp. Weekly jobs
advance one settlement week at a time after success, including downtime
catch-up. Recurring maintenance skips obsolete individual ticks after success.
On first migration, weekly schedules start at this week's Monday 09:00/09:30
IST. Older missed settlements predating installation require an audited
backfill; do not silently assume the new scheduler found them.

A lease alone is not exactly-once execution. Money and order transitions also
need business-level idempotency. Payout releases, refunds and notification
outboxes are separate item-claimed consumers, not globally serialized schedule
rows. Each worker replica drains disjoint batches, so adding workers increases
queue throughput. Consumers poll with jitter and error backoff, with local
non-overlap and graceful drain; item leases recover abandoned batches:


- Store settlements aggregate the full week's delivered orders in SQL and use
  the existing store/week uniqueness constraint. Rider computation retains its
  atomic payout/earning-link function and rider/week uniqueness.
- Pending payouts are row-locked and changed to processing in the same
  transaction that freezes their provider request into `payout_release_work`.
  Workers drain 25 transfers per kind per pass, at most five HTTP calls at a
  time per worker. Size worker concurrency to the provider quota. Each transfer has its own claim token/expiry and recovery backoff.
  Amount, destination, mode and source account stay fixed across retries.
  The work UUID is sent as Razorpay's `X-Payout-Idempotency`; `reference_id`
  remains the payout-row ID for webhook correlation. A lost response retries
  the identical body/key. The HTTP call has a 15-second timeout.
- Provider acceptance does not mark earnings paid. Paid/failed/reversed webhooks settle
  both store and rider payouts atomically; earning paid markers are written only after
  rider payout confirmation. Early webhook terminal states are not overwritten
  by a late HTTP-response save. No configured RazorpayX account means held
  pending settlements, not automatically failed payments.
- Dispatch initial/expanded offers are advanced in a bounded SQL transaction
  with row locks and eligibility rechecks. The worker also recovers a packed
  order whose initial API dispatch never ran. Persisted offers remain pollable
  even if push delivery fails. Exhausted offers stay available for manual
  assignment. This is a best-effort push, not a guarantee of exactly-once
  notification delivery.
- Expiry retains its transactional inventory/payment validation. Refund and
  customer-notification jobs retain their existing item-level claim tokens,
  provider idempotency/reconciliation and outbox logic. Push notifications are
  at-least-once and can duplicate after an ambiguous provider response.

Do not manually clear `payout_release_work` or regenerate a key after a timeout.
Provider configuration/body errors remain held for operator review/backoff.
Review historical processing payouts without a durable work row, failed payouts,
and undelivered provider webhooks separately; no speculative re-payment/backfill
is performed. Do not change payout source accounts while unresolved releases
exist. A worker lease cannot undo an external call already in flight.

## Verification and operations

Tests cover exact-location validation, cache normalization without rounding,
schedule date preservation, lease loss, provider request identity, radius/zone
filtering, poles/dateline, retry takeover, stale token rejection, weekly compute
idempotency, frozen payout destination/body and early webhook preservation.
`tests/sql/discovery-workers.sql` is guarded to the isolated local fixture and
rolls back its schema/data changes. No shared database migrations are applied.

Monitor worker errors, `scheduled_work.last_success_at`, overdue next_run_at,
lease expiry/takeovers, payout attempts/last_error and outbox backlog. Alert if
maintenance is stale or any weekly settlement remains incomplete after its due
time. Retain payout request records for audit/recovery. Size workers from job
latency/backlog, not API active-user counts. Production EXPLAIN/load testing and
provider sandbox verification are still required before claiming 10k–50k-user
capacity; these changes remove the two identified architectural multipliers.

Provider contract: https://razorpay.com/docs/api/x/payout-idempotency/

Capacity metrics, expiry draining and autoscaling rollout: see `CAPACITY_AND_EXPIRY.md`.
