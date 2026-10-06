# Backend/database audit — 5 October 2026

The supplied audit was checked against the current checkout, permissions,
fulfilment, discovery, cache, streaming, workers and migration code. Its tiny
live dataset does not establish a concurrent-user capacity.

| Finding | Current disposition |
| --- | --- |
| Checkout reads | Eligibility catalogue snapshot reused; final locked SQL stock validation retained. |
| Pack inventory | 086 rejects unconfirmed/untracked stock at reservation time; pack counts are retail units, with transactional expiry/cancellation release. Admin must configure actual counts, never inferred weights. |
| Customer order insertion | 078 removes client write permissions. Backend service role is the checkout boundary. |
| Merchant/product approvals | 078 protects approval and activation; backend eligibility revalidates them. |
| Public stores/catalogue | 079 exposes safe public projections; 084 bounds search/catalogue pages and scopes them to deliverable shops. |
| Search indexes | 084 provides trigram/full-text indexes. Validate EXPLAIN under realistic distributions. |
| History | Cursor pagination and indexes retained; deep-page workload needs staging measurement. |
| Repeat purchases | **090** ranks inside SQL over the latest 100 delivered orders, filters deliverable/approved/available shops and transfers at most ten product IDs. No line-item history transfer. |
| Ratings | **088** validates delivered-order ownership/store identity, prevents rating/content changes, enforces one review per order, and updates count/sum/average atomically. Moderator deletion updates the same totals; owner replies remain supported. |
| Default address | 082 serializes customer address changes and enforces a partial unique default-address index. |
| Coupon limits | 083 locks and revalidates expiry/usage/value with order creation, including unpaid cancellation release. |
| Refund intent | 080 commits cancellation and durable refund intent together. Leased workers handle provider recovery. |
| Rider earnings | 080 commits delivery/earnings in one transaction with uniqueness protection. |
| Trip fulfilment | Pickups intentionally confirm individual physical shop stops. Customer arrival is local state. **089** verifies one shared destination proof and delivers every ready live leg atomically; rider screens send one verification, update all local siblings and retain idempotent retry. 086 already coordinates failed-trip handling. |
| Local caches | Existing bounded cache/in-flight combining retained. Added hit/miss/coalesced counters without address/account labels. Cross-replica shared caching remains a measured deployment choice, with correctness invalidation required. |
| Tracking payload | Summary/tracking share static detail caching plus lightweight live status; temporary failures preserve prior details. |
| SSE | Bounded per-replica/per-IP admission, explicit busy responses, scoped fan-out and immediate slow/broken-stream termination. Admission/disconnect metrics added; client reconnect/fallback remains jittered and foreground-only. |
| Workers | Existing dedicated leased worker retained. Added missing/stale worker, overdue work and SSE saturation alert rules. Actual production worker deployment/alert delivery remains unverified. |
| Migration drift | Complete-filename SHA-256 manifest retains both legacy 051 files. **091** recovers missing legacy tables/columns/functions without altering historical files. A full clean-schema rebuild now runs in CI in canonical dependency order. This does not fabricate or reconcile a live applied ledger. |

## Rollout order

Existing environments: apply **087 if still pending, then 088, 089, 090 and
091** before deploying their dependent backend/rider/admin changes. These were
not applied to the live database in this task. Ratings require 088 before the
new review API and moderation flow; rider whole-trip local updates require
089 first. Review actual shop pack counts before accepting orders.

Fresh installs use `migrations/manifest.json`, not numeric-prefix-only ordering:
091 is a compatibility prerequisite after 006 and before 007. Both 051 files
have distinct full filename identities. The historical 051 phone reconciliation
is data-changing: do not rerun historical migrations against an existing live
environment just to create a ledger. Establish the remote baseline from schema
verification and deployment records.

`node scripts/migrations.mjs` verifies filenames/checksums. Regenerate with
`--write` only after reviewing SQL changes. For the complete fresh install,
create a disposable empty database named `flikk_migrations_tests` and run
`PGDATABASE=flikk_migrations_tests node scripts/verify-fresh-migrations.mjs`
with PG connection variables. Its bootstrap emulates Supabase-owned auth,
storage and publication objects; all application tables come from migrations.

## Operations and capacity acceptance

Deploy the dedicated worker process (`node dist/workers/index.js`), not extra
schedulers in API replicas. The existing Kubernetes reference and alerts are
configuration examples, not evidence of deployment. Check schedule timestamps,
queue age, failed financial work and worker heartbeats after rollout.

SSE defaults to 2000 connections per replica and 100 per IP; these are safety
bounds, not throughput claims. At the reverse proxy disable response buffering
for `/home/content/events`, keep the idle timeout above the 20-second heartbeat,
and drain old replicas gracefully. Configure `TRUST_PROXY_HOPS` for the actual
proxy topology; never trust arbitrary forwarded headers. Enforce global
connection/reconnect limits at the edge. Mobile carrier NATs can share addresses,
so size the IP cap using real traffic and admission metrics.

Use `flikk_read_cache_requests_total{outcome="hit|miss|coalesced"}` to measure
cache reuse. Coordinate/eligibility results remain exact; rounding delivery
addresses into a shared result can serve the wrong radius-edge assortment.
Introduce shared cross-replica caching only with revision fencing, bounded TTL,
invalidation and an outage fallback, after miss traffic demonstrates the need.

Run the staging mixed workload in `load-tests/customer-workload.js` against
realistic catalogue/history volumes, with multiple API and worker replicas.
Separately soak long-lived streams, reconnect bursts, slow readers, hot-stock
contention, quote expiry and worker restart/provider failures. Record p95/p99,
errors, event-loop delay, connections/lock waits, queue age and cache ratio before
choosing replica counts. Neither the audit snapshot nor these unit/SQL checks
proves support for 10k–50k concurrent users.

## Validation completed

- 426 backend tests passed; backend TypeScript build and ESLint passed.
- Rider and admin TypeScript checks passed.
- Full clean install: all 92 SQL files, with Supabase-like table defaults.
- Real PostgreSQL permissions and order-financial deployment checks passed on
  both targeted regression fixtures and the complete clean schema.
- Review ownership/uniqueness/immutable content, moderator deletion totals,
  concurrent reviews, repeat-purchase account isolation, unready trip rejection,
  wrong proof, whole-trip financial rollback and delivery retry checks passed.
- No live application records were exported or live migrations applied. Native
  rider/customer flows, deployed worker activity, alert receivers and sustained
  production-equivalent capacity remain operational acceptance work.
