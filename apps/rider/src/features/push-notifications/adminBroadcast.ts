// Admin fleet broadcast — the free-text ops push a founder sends from admin's
// POST /admin/fleet-push (backend/src/lib/fleetPush.ts). Unlike an order/
// assignment push it carries NO orderId/tripId and has no in-app screen to
// route to: it is a fire-and-forget OS notification (no server feed row, no
// per-device outbox), so the ONLY handling an app needs is to surface it —
// foreground via this app's global setNotificationHandler (notifyIncomingOrder
// .ts, registered at boot), background via the OS automatically.
//
// This module is the single, tested source of truth for the payload SHAPE the
// backend sends (contract: data.type === 'admin_message'). Kept pure (no
// react-native / expo-notifications import) so the self-check runs under tsx.

// The three fleet audiences the backend's /admin/fleet-push accepts. The shared
// admin_push_messages.audience column also carries pre-existing customer values
// ('customer' / 'all_customers') — those are NOT fleet broadcasts and never
// reach a rider device, so they are deliberately absent here.
export type FleetAudience = 'all_riders' | 'online_riders' | 'partners';

// data.kind on the push: 'partner' for the partners audience, 'rider' for both
// rider audiences. A rider device only ever acts on 'rider'.
export type AdminBroadcastKind = 'rider' | 'partner';

export interface AdminBroadcast {
  kind: AdminBroadcastKind;
  audience: FleetAudience;
}

const AUDIENCES: readonly FleetAudience[] = ['all_riders', 'online_riders', 'partners'];
const KINDS: readonly AdminBroadcastKind[] = ['rider', 'partner'];

// Returns the parsed broadcast for a push's `data` payload, or null if it is
// anything other than a well-formed admin fleet broadcast (an order push, a
// customer notification, a malformed/old payload). Strict on purpose: a bad
// enum value from a backend change should fail the self-check, not be silently
// treated as a broadcast.
export function parseAdminBroadcast(data: unknown): AdminBroadcast | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, kind, audience } = data as Record<string, unknown>;
  if (type !== 'admin_message') return null;
  if (typeof kind !== 'string' || !KINDS.includes(kind as AdminBroadcastKind)) return null;
  if (typeof audience !== 'string' || !AUDIENCES.includes(audience as FleetAudience)) return null;
  return { kind: kind as AdminBroadcastKind, audience: audience as FleetAudience };
}
