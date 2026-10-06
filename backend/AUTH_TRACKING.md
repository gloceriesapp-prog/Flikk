# Authentication and lightweight tracking

## Deployment

Apply migrations 069 (service-only authorization context and role-change publication), 070 (order/trip revisions), and 071 (session expiry aware v2 context), then deploy backend/customer app. Shared Supabase was checked read-only during this task: v2 RPC and tracking revision columns were absent. Migrations were tested only in the disposable local fixture, not applied to the shared database.

The project's public JWKS was checked and advertises ES256, enabling the SDK's local signature verification for current asymmetric tokens. Old symmetric tokens still use the SDK's remote verification fallback. Do not copy the service-role secret into any app or implement JWT signature verification by hand.

Set NODE_ENV=production or AUTH_REQUIRE_SESSION_CONTEXT=true. Production fails closed with 503 if the RPC is missing or the token lacks a session_id; such old tokens need a new sign-in. Development alone permits the legacy remote-verification/profile path while migrations are pending. Restart instances after applying migrations to clear the five-minute missing-schema backoff.

## Authentication policy

`middleware/auth.ts` uses `auth/authenticate.ts`. `getClaims(token)` verifies the signature; the backend also validates issuer, authenticated audience/role, subject UUID, session UUID, expiry and not-before. App roles are loaded from public.users, never from user-controlled JWT metadata. Token-cache keys are SHA-256 hashes, not raw tokens. No bearer token is logged or retained as a cache value.

Verified identities and authoritative role/session contexts have separate LRU caches, each bounded to 50,000 entries and 1,000 outstanding loads per process. Cache misses for the same key share a promise. Direct SDK verification is additionally capped at 128 concurrent operations, so mutation requests cannot bypass the load bounds. Overload fails with retryable 503. Cache TTL is randomized between 20 and 30 seconds and measured from lookup start, preventing slow lookups from extending stale authorization.

Context is keyed by user AND session. The v2 RPC checks the Auth account is not banned/deleted, that the session belongs to that account, and that its absolute expiry has not passed. Known session expiry and JWT expiry are checked on every request, even on cache hits. Roles remain server-authoritative. Profile/role realtime events invalidate every session for the affected account; channel transitions clear contexts to cover missed events. Explicit invalidation also rejects stale in-flight results. Independent fresh requests do not cancel each other's authorization.

Every non-read request and every admin request bypasses the role/session cache and also checks Auth remotely. Ordinary reads can retain a newly revoked session/ban for at most the 30-second context window when there is no realtime signal for that Auth-table change. This is a bounded read policy, not instantaneous revocation. Failures do not reuse expired cache entries or invent a customer role.

Signing-key revocation is different: the SDK caches JWKS (roughly ten minutes), and identity caching can add up to thirty seconds. For an emergency, set AUTH_FORCE_REMOTE_VERIFICATION=true and restart ALL backend instances, then perform provider-side revocation. That forces fresh remote verification and context checks for reads too. Financial/account writes and admin reads already use fresh checks. Do not advertise immediate signing-key revocation for normal locally verified reads.

References: https://supabase.com/docs/reference/javascript/auth-getclaims and https://supabase.com/docs/guides/auth/sessions.

## Tracking policy

`tracking/live.ts` mounts before the full order/trip routers. Customer-only `/orders/:id/live` and `/trips/:id/live` filter by verified customer ID and return only dynamic status, ETA, milestones, rider ID, delivery OTP, payment/refund progress and revision. No items, addresses, storefront joins, rider profile or historical rider delivery count are repeatedly transferred. Responses are private/no-store, with no shared customer response cache.

`useTracking` loads full details into the account-scoped order/trip cache, then polls the lightweight endpoint every 8–12 seconds on a stable, randomly chosen per-tracker cadence (so countdown rerenders cannot reset the polling timer), only while focused and foregrounded. Full details are not polled. Completed orders stop polling after any pending refunds settle. Temporary errors preserve previous information and show stale/retry states. Rider assignment or leg-set changes cause one detail refresh per live poll; a lagging successful response cannot form an immediate refetch loop.

Revision triggers increment monotonically on order/trip updates. Merges preserve static detail rows and reject older live fields; child order revisions can advance independently of a trip parent. Polling termination uses the merged latest state, so an old completed-refund response cannot hide a newer refund still processing. Cache advancement is version-gated, preventing self-triggered cache update loops and restoring newer live state when an older full-detail response arrives late.

## Verification and limits

Run Vitest src/auth, src/tracking, src/home-sync and src/middleware/shortCache.test.ts; backend/customer TypeScript; and backend/tests/sql/auth-tracking.sql on a disposable fixture. Tests cover real ES256 signatures/tampering, cache coalescing, load bounds, fresh mutations/admin reads, expiry, stale in-flight invalidation, metadata privilege escalation, missing-schema failure, ownership, version ordering and bounded detail refreshes.

These changes reduce cloud authorization calls and transferred tracking data. They do not prove 10k–50k-user throughput. Each active tracked order still needs a lightweight status read every 8–12 seconds; multiple instances do not share authorization caches. Measure auth/RPC rates, p95/p99 tracking latency, 503 overload rate, outbound connection saturation and database CPU under representative user/session churn. Native-device background/resume and degraded-network tests remain rollout checks.
