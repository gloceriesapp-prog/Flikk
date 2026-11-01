// Pure in-memory buffer for analytics events — no React Native imports, so
// eventQueue.selfcheck.ts can run it under plain tsx. track.ts owns sending.
// Bounded: if the rider is offline for hours the oldest events go first, so
// memory stays flat; analytics is best-effort, never worth an OOM.

export type RiderEventName =
  | 'app_opened'
  | 'screen_viewed'
  | 'went_online'
  | 'went_offline'
  | 'offer_viewed'
  | 'offer_accepted'
  | 'offer_dismissed'
  | 'navigation_opened'
  | 'customer_called';

export type EventProps = Record<string, string | number | boolean>;
export interface QueuedEvent { name: RiderEventName; at: string; props?: EventProps }

export const MAX_QUEUED = 200;
export const BATCH_SIZE = 50; // matches backend MAX_EVENTS_PER_BATCH

export function createEventQueue(max = MAX_QUEUED) {
  let items: QueuedEvent[] = [];
  return {
    push(event: QueuedEvent) {
      items.push(event);
      if (items.length > max) items = items.slice(items.length - max);
    },
    take(n = BATCH_SIZE): QueuedEvent[] {
      const batch = items.slice(0, n);
      items = items.slice(batch.length);
      return batch;
    },
    // A batch that failed on the network goes back in front, still bounded.
    putBack(batch: QueuedEvent[]) {
      items = [...batch, ...items].slice(-max);
    },
    clear() {
      items = [];
    },
    get size() {
      return items.length;
    },
  };
}
