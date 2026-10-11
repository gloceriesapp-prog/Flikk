// Admin fleet broadcast — the founder pushing one operational message to every
// rider (or only the online ones) or to every store owner. The audience ->
// token resolution, rate limit and audited admin_push_messages row all live in
// the admin_send_fleet_push RPC (migration 20261010120000); this file holds the
// enum guard, the input validation and the Expo message shaping the apps agree
// on, plus a best-effort batched sender.
//
// Mirrors backend/src/lib/fleetPush.ts (same enum, same payload) rather than
// sharing code — this Next.js app and the Express backend aren't set up to
// share a package (CLAUDE.md's no-premature-sharing rule), same as the existing
// pushNotification.ts duplication.

export const FLEET_AUDIENCES = ['all_riders', 'online_riders', 'partners'] as const;
export type FleetAudience = (typeof FLEET_AUDIENCES)[number];

export function isFleetAudience(value: unknown): value is FleetAudience {
  return typeof value === 'string' && (FLEET_AUDIENCES as readonly string[]).includes(value);
}

// Which app receives it — the apps branch on data.kind to route the tap.
export function fleetPushKind(audience: FleetAudience): 'rider' | 'partner' {
  return audience === 'partners' ? 'partner' : 'rider';
}

export const FLEET_AUDIENCE_LABEL: Record<FleetAudience, string> = {
  all_riders: 'All riders',
  online_riders: 'Online riders',
  partners: 'Store partners',
};

export interface FleetPushInput {
  audience: FleetAudience;
  title: string;
  body: string;
}

export type FleetValidation = { ok: true; value: FleetPushInput } | { ok: false; error: string };

// Same bounds as the RPC (title 1-80, body 1-240) so a bad compose is a 400
// before the round-trip; the RPC re-checks server-side as the source of truth.
export function validateFleetPushInput(raw: { audience?: unknown; title?: unknown; body?: unknown }): FleetValidation {
  if (!isFleetAudience(raw.audience)) return { ok: false, error: 'Pick who to send to.' };
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  if (title.length < 1 || title.length > 80) return { ok: false, error: 'Title must be 1–80 characters.' };
  if (body.length < 1 || body.length > 240) return { ok: false, error: 'Message must be 1–240 characters.' };
  return { ok: true, value: { audience: raw.audience, title, body } };
}

export interface FleetPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high';
  data: { type: 'admin_message'; kind: 'rider' | 'partner'; audience: FleetAudience };
}

// One Expo message per unique, non-blank token so a rider signed in on two
// stale installs is not paged twice.
export function fleetPushMessages(tokens: readonly (string | null | undefined)[], audience: FleetAudience, title: string, body: string): FleetPushMessage[] {
  const kind = fleetPushKind(audience);
  return [...new Set(tokens.filter((t): t is string => typeof t === 'string' && t.length > 0))].map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    priority: 'high',
    data: { type: 'admin_message', kind, audience },
  }));
}

// Best-effort send — Expo's /push/send takes up to 100 messages per request,
// so a broadcast to N devices is ceil(N/100) HTTPS calls. A failed batch never
// throws: the audited admin_push_messages row is already recorded by the RPC,
// same fire-and-forget contract as the partner order push.
export async function sendFleetPushNotifications(messages: FleetPushMessage[]): Promise<void> {
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch {
      // Best-effort — one failed batch never throws.
    }
  }
}
