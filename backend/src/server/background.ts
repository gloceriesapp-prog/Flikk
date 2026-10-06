import { startHomeContentSync, stopHomeContentSync } from '../routes/homeContent.js';

// API replicas own only their realtime subscription/cache invalidation.
// Durable jobs are started exclusively by the separate workers/index entry.
export function startBackgroundServices(): () => Promise<void> {
  startHomeContentSync();
  return stopHomeContentSync;
}
