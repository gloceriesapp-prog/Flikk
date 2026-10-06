# Backend startup and shutdown

Run `npm run dev` in `backend`. The launcher loads `.env.local`, validates `PORT`, and starts one tsx watcher for this checkout/port. Local ownership lives in the ignored `.dev-runtime/` directory and survives hot reloads. Normal shutdown releases it; stale process ownership is checked on the next start.

If the port already serves Gloceries, the command reports that the backend is already running and exits successfully without another watcher or background worker. If an unknown process occupies it, startup fails clearly and leaves that process untouched. Inspect with `lsof -nP -iTCP:4000 -sTCP:LISTEN`. Stop the existing backend with Ctrl+C in its terminal before restarting when required. Ports are never automatically changed, so customer API URLs remain consistent.

The HTTP bind is authoritative even if another process wins a race after the development check. A handled bind failure logs an actionable message and exits nonzero; no cron jobs or realtime subscriptions start. This protection also applies to production `node dist/index.js`.

After successful binding, realtime sync and schedules start through `src/server/background.ts`. Each job avoids overlapping itself within one process. Existing database leases/idempotency remain responsible for coordination across production replicas; this startup change does not turn every cron job into a distributed singleton.

SIGINT/SIGTERM stop accepting HTTP connections, stop cron schedules, close SSE streams and realtime sync, wait for running requests/jobs, then close database HTTP connections. Shutdown has a 15-second limit; persisted jobs and provider-idempotent operations recover after restart. HTTP server failures use the same shutdown path. Local launcher shutdown gives the watcher 20 seconds to finish.

Tests verify a real occupied port starts no background work, successful bind starts work once, repeated shutdown cleans up once, and startup failures release the listener. No live payments or database mutations are used for these tests.
