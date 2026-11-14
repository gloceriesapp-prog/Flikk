# Partner live order updates

The authenticated `/partner/orders/events` endpoint derives store access from the current account. It emits only invalidation/health signals; the existing authenticated queue API remains authoritative. One database realtime subscription per API replica fans out only to connected devices for the affected store. Orders already participate in the existing realtime publication (migration 017); no new migration is needed.

Connections expire after 55 seconds to recheck token validity, suspension and store access. Idle heartbeats, capacity limits, burst coalescing, bounded client buffers and slow-client disconnection constrain resource usage. Reconnect health triggers a fresh snapshot. The Android/iOS app closes the stream in the background and on token/session changes; a single serialized refresh loop prevents overlapping refreshes. Polling falls back to about 3.5 seconds with jitter and bounded outage backoff, or 30 seconds while the stream is healthy. Older backends without the endpoint remain usable through fallback polling.

First-load recovery includes unaccepted placed orders still inside their acceptance window. Accepted, packed, expired and terminal orders never gain a new Accept prompt. No order status, payment, reservation or refund is changed by this feature.

## Validation and rollout

Run the Partner type check and the focused backend partner queue/routing/stream/attention tests. Server tests cover 200 concurrent writes coalesced per store, store isolation, proxy compression protection, stream expiry and slow clients. Client tests cover fragmented frames, heartbeat handling, authorization headers, cleanup, reconnect and memory bounds.

Deploy backend first through the existing main-branch pipeline. Refresh the local Partner app and verify an authorized real order or guarded staging order reaches only its owning store, then verify acceptance on that same exact app build before releasing Partner. Do not create or mutate a real order merely to validate the stream. A signed-in real-device store check and production stream verification are still required after deployment. Rollback the backend commit or previous deployment and retain fallback polling; stop the app stream via an app rollback if needed.
