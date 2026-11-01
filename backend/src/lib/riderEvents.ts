// Rider product analytics (CLAUDE.md: "PostHog or Supabase event table" — the
// table, so rider behaviour stays in our own database next to orders, at no
// extra cost). Only what the server can't already see from orders/riders:
// app opens, screens, online sessions, how riders react to offers, and which
// in-app actions they use. Pure validation so it's testable without Supabase;
// POST /rider/events (routes/rider.ts) inserts what this returns.

export const RIDER_EVENT_NAMES = [
  'app_opened',
  'screen_viewed',
  'went_online',
  'went_offline',
  'offer_viewed',
  'offer_accepted',
  'offer_dismissed',
  'navigation_opened',
  'customer_called',
] as const;
export type RiderEventName = (typeof RIDER_EVENT_NAMES)[number];

export const MAX_EVENTS_PER_BATCH = 50;
const MAX_PROPS = 8;
const MAX_STRING = 64;
const MAX_PAST_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;
const NAMES = new Set<string>(RIDER_EVENT_NAMES);
const KEY = /^[a-z][a-z0-9_]{0,31}$/;
// Props carry ids and labels only — never free text a rider typed, so no PII
// can arrive through this table by accident.
const PHONE_LIKE = /\d{7,}/;

export interface RiderEventRow {
  rider_id: string;
  name: RiderEventName;
  props: Record<string, string | number | boolean>;
  occurred_at: string;
  app_version: string | null;
  platform: 'ios' | 'android' | null;
}

function cleanProps(raw: unknown): Record<string, string | number | boolean> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw).slice(0, MAX_PROPS)) {
    if (!KEY.test(key)) continue;
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) out[key] = value;
    else if (typeof value === 'string' && value.length <= MAX_STRING && !PHONE_LIKE.test(value)) out[key] = value;
  }
  return out;
}

// A device clock can be wrong or an event can sit queued offline: keep the
// client time only when it's plausible, otherwise record arrival time.
function occurredAt(raw: unknown, now: number): string {
  const at = typeof raw === 'string' ? Date.parse(raw) : NaN;
  return Number.isFinite(at) && at >= now - MAX_PAST_MS && at <= now + MAX_FUTURE_MS
    ? new Date(at).toISOString()
    : new Date(now).toISOString();
}

// Unknown names and malformed entries are dropped, not rejected: an older
// app version sending a retired event name must never fail the whole batch.
export function parseRiderEvents(body: unknown, riderId: string, now = Date.now()): RiderEventRow[] {
  const b = (body ?? {}) as { events?: unknown; app_version?: unknown; platform?: unknown };
  if (!Array.isArray(b.events)) return [];
  const appVersion = typeof b.app_version === 'string' && b.app_version.length <= 32 ? b.app_version : null;
  const platform = b.platform === 'ios' || b.platform === 'android' ? b.platform : null;
  return b.events.slice(0, MAX_EVENTS_PER_BATCH).flatMap((e) => {
    const ev = (e ?? {}) as { name?: unknown; at?: unknown; props?: unknown };
    if (typeof ev.name !== 'string' || !NAMES.has(ev.name)) return [];
    return [{
      rider_id: riderId,
      name: ev.name as RiderEventName,
      props: cleanProps(ev.props),
      occurred_at: occurredAt(ev.at, now),
      app_version: appVersion,
      platform,
    }];
  });
}
