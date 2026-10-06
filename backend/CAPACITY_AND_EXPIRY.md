# Reservation expiry and measurable capacity

## Deploy and enable

Apply migration 076 after 075, then migration 077. Restart API and worker with
this code. The shared database has not been migrated by this task. Migration
076 retires the five-minute expiry schedule and replaces it with an item-claimed
worker queue. Older expiry callers retain a compatible RPC using the same
transaction implementation. Worker startup checks the new schema. Keep a
worker alive continuously; starting only the API does not run cleanup.

Monitoring listens separately from the customer API. Defaults: API
`127.0.0.1:9464`, worker `127.0.0.1:9465`. Set `METRICS_PORT` for multiple local
processes. Containers use separate network namespaces and can both use 9464.
Set `METRICS_TOKEN` to a secret of at least 32 characters to enable protected
`GET /metrics` and the database collector. Use `Authorization: Bearer TOKEN`.
Configure `METRICS_HOST=0.0.0.0` only on a private scrape network. No public
monitoring Service/ingress is provided. `/livez` and `/readyz` are process
probes; readiness reflects startup/drain state, not a database availability
promise. The token is never included in metric labels or examples.

## Expiry behavior

Each RPC claims up to 100 standalone orders and 100 trips with
`FOR UPDATE SKIP LOCKED`. It compares indexed timestamps to a cutoff captured
once per batch. Trips are parent-locked before child orders; products used by
all selected targets are locked globally by ID before stock release. This
prevents competing batches acquiring shared products in opposite orders.
Unpaid/placed/online gates and final stock-release triggers remain intact.
Transactions have a one-second lock timeout so prolonged contention causes a
rollback/retry rather than holding a worker indefinitely.

One worker pass drains up to ten batches with a five-second between-batch
budget and event-loop yields. If the final batch is full, another pass starts
in 25–100ms. Partial/empty results use the existing 1.5–3s idle jitter. Multiple
worker replicas claim separate targets. On failure, polling backs off up to
approximately 30 seconds; metrics and expiry-age alerts expose stalled cleanup.
The budget does not interrupt an in-flight database transaction. Shutdown stops
starting further batches and lets the current one finish, within the existing
process drain deadline. This is prompt polling, not an exact sub-second expiry
SLA. Transactional payment checks still reject payment after checkout expiry.

`single_targets` and `trip_targets` drive draining, not cancelled leg count:
one 100-trip batch may contain more than 100 orders. Counts/logs avoid customer
identifiers. The old compatibility RPC still returns the original row array.

## Measurements

| Measurement | Source and meaning |
| --- | --- |
| HTTP duration/errors/in-flight | Route-template histograms/counters; status families; no query strings or order IDs |
| SSE duration | Separate connection histogram; long-lived streams excluded from request-latency distribution |
| Database HTTP latency/errors/in-flight | Shared Supabase agent; operation/table labels; round trip through response headers, not PostgreSQL execution time |
| Event-loop delay/utilization | Node perf hooks, sampled every 15–17 seconds |
| RSS, heap, CPU, uptime | Process metrics; CPU is cumulative user+system seconds, RSS in bytes |
| Expiry backlog/age | Held reservation lines past expiry and oldest expired timestamp |
| Notification/refund/payout backlog | Unsent/unresolved work, including delayed provider processing, not just immediately claimable rows |
| Database connections/activity | Current-database `pg_stat_activity` counts; includes all application roles |
| Lock waits | Waiting query count and oldest waiting query's elapsed age; query age is an upper-bound proxy, not exact lock-wait duration |
| Database transactions/buffers/deadlocks | Cumulative `pg_stat_database` counters; use deltas and account for stats resets |
| Worker activity/pass failures | Per-queue running state, durations and last successful pass time |

Database gauges use one shared, private 15-second snapshot. An advisory
transaction lock combines concurrent samplers from API/worker replicas. Each
queue count is bounded at 10001; `*_capped=1` explicitly means the value is a
lower bound, not the precise queue length. Oldest expiry age remains uncapped.
If collection fails, the last successful gauges remain, collection success
becomes zero and the sample timestamp reveals staleness. Scrapes perform no
additional database reads. SQL text, tokens, addresses, customer IDs and raw
order IDs are never exported. Labels/series/families are bounded; alert on
`flikk_metric_series_dropped_total` increasing and revise limits if needed.

These are not direct database CPU, disk latency or connection-pool saturation
metrics. Add Supabase provider metrics or a PostgreSQL exporter, and inspect
slow-query plans/lock details using privileged operational tooling. A rise in
API latency accompanied by database waits needs database investigation; adding
API replicas can worsen it.

## Sustained workload

`load-tests/customer-workload.js` is a k6 arrival-rate workload. It mixes
bounded catalogue reads, cached and distinct-coordinate discovery, history
pages, live tracking and checkout quotes. Use a dedicated staging database
with realistic history sizes and stocked products. Copy
`fixtures.example.json` to the ignored `fixtures.local.json` and supply many
real staging customers with owned addresses/orders, valid tokens and real
product/variant IDs. Preflight checks fixture eligibility. Run during supported
operating hours. Neither order creation nor provider money movement is included.

From `backend/load-tests`:

```
TARGET_ENV=staging BASE_URL=https://YOUR-STAGING-API \
RATE=100 MAX_VUS=500 k6 run customer-workload.js
```

Defaults: two-minute ramp, fifteen-minute hold, two-minute cooldown. Increase
RATE in separate runs (e.g. 25, 100, 250, 500), holding each rate long enough to
observe stable queues/latency and collect database telemetry. Nonzero dropped
iterations invalidates the generator's ability to sustain the requested rate.
Error and p95/p99 thresholds fail the run; the script writes a summary with the
configured rate, fixture population, metrics and threshold outcomes, without
auth tokens. Set SUMMARY_FILE to retain each run separately. The arrival rate
is iterations per second; occasional next-page reads mean request rate can be
slightly higher. One iteration is not one active customer.

The initial thresholds (p95 <750ms, p99 <2s, errors <1%) are acceptance targets,
not measured production SLOs. A successful run on mock responses establishes
script correctness only. Generate realistic staging stock, old customer
histories and contention before capacity claims. Also test SSE connections,
checkout/reservation writes, payment callbacks, background queues, replica
termination and cold caches separately. Existing isolated SQL concurrency tests
cover correctness of writes; they are not sustained database saturation tests.

Use `load-tests/local-fixture.ts` only to validate script wiring locally. It
binds localhost, serves fake schemas and never accesses Supabase. A 40-second
local run with a 30-second hold completed 362 requests with all thresholds
passing and no dropped iterations. This is explicitly **not a backend capacity
benchmark**. The isolated SQL burst drained 650 orders (350 singles plus 150
2-leg trips) in four batches and verified exactly-once stock restoration,
paid/COD/unexpired exclusions, snapshot caching and private RPC permissions.
The two-worker disposable-fixture test additionally checks rollback recovery
and competing claims. Those timings do not predict production throughput.

## Autoscaling reference

`deploy/kubernetes/capacity.yaml` contains separate API/worker Deployments,
resource requests/limits, probes, graceful termination and bounded HPA rules.
It is a portable reference, not an applied deployment. Replace the image,
provide the two referenced Secrets and adapt namespace/network/registry/ingress
to the actual platform. No container build pipeline or cluster is assumed.

API scaling initially uses CPU (65%, 2–10 replicas) and controlled scale-down.
This does not capture database-bound latency; validate the CPU target against
latency/event-loop data and database headroom. Worker scaling uses an external
expiry-backlog metric (200 expired lines per desired worker, 2–6 replicas).
Install Metrics Server for CPU HPA and Prometheus Adapter external metrics for
worker HPA. Merge `prometheus-adapter.yaml` into its values. Scrapes must attach
namespace/pod labels. The adapter exposes **max** of the shared backlog, never
sum of copies from replicas. External AverageValue lets HPA allocate that one
queue across workers. Missing external metrics cannot provide reliable worker
scaling; configure/verify it before rollout. Refund/payout/notification workloads
need their own headroom/age alerts and can justify a larger minimum, even when
expiry is empty. All replica caps and resource values are placeholders pending
staging results and provider quotas.

Prometheus alert examples live in `deploy/alerts.yaml`. Scrape each API and
worker's monitoring port every 15 seconds with the token read from a Secret;
never point Prometheus only at a load-balanced API address. Verify the rules,
receiver and alert delivery in the deployment platform. Alert on stale/missing
samples, oldest expiry, lock waits, event-loop lag and latency/errors. These
files do not install a monitoring stack or configure an alert destination.

Size replicas from sustained per-replica throughput with acceptable p95/p99,
error rate, loop delay and stable backlog, then reserve headroom (e.g. 30%).
Translate active customers into measured requests per second first. If 10000
active customers make one request every 20 seconds, that's 500 RPS, before
background traffic and retries. No 10k–50k capacity or saturation point is
verified until the actual staging/production-equivalent tests have run.

Primary references:
- https://grafana.com/docs/k6/latest/using-k6/thresholds/
- https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
