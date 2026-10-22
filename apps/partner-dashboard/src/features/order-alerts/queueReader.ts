// Per-mounted-session cache: coalesce concurrent reads and transfer the full
// queue only when its lightweight server version changes.
export function createQueueReader<T>(readVersion: () => Promise<{ version: string; hasMore: boolean }>, readQueue: () => Promise<T>) {
  let version: string | undefined;
  let cached: T | undefined;
  let inFlight: Promise<T> | null = null;
  return () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const digest = await readVersion();
      if (cached !== undefined && digest.version === version && !digest.hasMore) return cached;
      const result = await readQueue();
      cached = result;
      version = digest.version;
      return result;
    })().finally(() => { inFlight = null; });
    return inFlight;
  };
}
