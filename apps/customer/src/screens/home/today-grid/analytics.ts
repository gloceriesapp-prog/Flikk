// Impressions (once per card per app session) and taps, through the existing
// logging: a Sentry breadcrumb plus a small batched POST the backend writes
// to its log (no analytics SDK). Failures are dropped; analytics never
// affects Home.
import * as Sentry from '@sentry/react-native';
import { postGridEvents, type GridEvent } from './api';

const seen = new Set<string>();
let queue: GridEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function send(event: GridEvent) {
  Sentry.addBreadcrumb({ category: 'today_grid', message: event.type, level: 'info', data: { ...event } });
  queue.push(event);
  if (timer) return;
  timer = setTimeout(() => {
    const batch = queue; queue = []; timer = null;
    void postGridEvents(batch).catch(() => {});
  }, 3_000);
}

export function trackImpression(event: Omit<GridEvent, 'type'>) {
  const key = `${event.slot}:${event.cardId}`;
  if (seen.has(key)) return;
  seen.add(key);
  send({ ...event, type: 'impression' });
}
export const trackTap = (event: Omit<GridEvent, 'type'>) => send({ ...event, type: 'tap' });
export const trackAddToCart = (event: Omit<GridEvent, 'type'>) => send({ ...event, type: 'add_to_cart', ledToAddToCart: true });

// Tests only.
export function resetGridAnalytics() { seen.clear(); queue = []; if (timer) clearTimeout(timer); timer = null; }
