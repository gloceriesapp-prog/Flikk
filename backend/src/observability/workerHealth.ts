// Worker-process liveness, surfaced to the API side. The customer pushes,
// dispatch-radius expansion and stuck-state alerts run only in the separate
// worker process (src/workers/index.ts); if it dies, the API keeps serving
// but that background work silently stops. The worker already stamps
// scheduled_work.last_success_at on every job completion (migration 075), and
// riderDispatch runs every 60s, so the freshest last_success_at across all
// scheduled jobs is a free heartbeat: if it stops advancing, the worker is
// down. This is the pure decision — the API's observability collector reads
// the timestamp and feeds it here (observability/runtime.ts).

// 3x riderDispatch's 60s cadence: tolerant of one or two missed passes /
// retry backoff before calling the worker unhealthy.
// ponytail: fixed threshold; make it an env/settings knob only if ops needs
// per-deploy tuning.
export const WORKER_HEARTBEAT_STALE_MS = 180_000;

export interface WorkerHealth {
  /** true only when a heartbeat exists and is within the staleness threshold. */
  healthy: boolean;
  /** seconds since the last worker heartbeat, or null when it has never run. */
  ageSeconds: number | null;
  /** true only when a known-good heartbeat has since gone stale (a real
   *  regression worth logging) — never for the pre-first-run startup window,
   *  so a fresh deploy does not spam WARN before the worker's first pass. */
  warn: boolean;
}

export function workerHealthFromHeartbeat(
  lastRunAtMs: number | null,
  nowMs: number,
  thresholdMs: number = WORKER_HEARTBEAT_STALE_MS,
): WorkerHealth {
  if (lastRunAtMs === null || !Number.isFinite(lastRunAtMs)) {
    // Never ran yet (e.g. just after deploy, before the first scheduled pass).
    // Reported as unhealthy via the gauge, but not WARN-logged.
    return { healthy: false, ageSeconds: null, warn: false };
  }
  const ageMs = Math.max(0, nowMs - lastRunAtMs); // clamp clock skew / future stamps.
  const stale = ageMs > thresholdMs;
  return { healthy: !stale, ageSeconds: ageMs / 1000, warn: stale };
}
