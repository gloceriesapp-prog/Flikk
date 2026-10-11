// Admin fleet broadcast — a founder pushing an operational message to every
// rider (or only the online ones) or to every store owner. Riders and partners
// authenticate their device by writing users.expo_push_token (POST
// /auth/push-token), exactly the column newOrderPush and riderDispatch already
// read, so this reuses sendPushNotifications (the batched Expo sender) rather
// than the customer outbox+worker, which is keyed on the customer-only
// customer_push_devices table.
//
// Audience -> recipient resolution, the rate limit, the recipient_count and the
// audit row all live in one place: the admin_send_fleet_push RPC (SECURITY
// DEFINER), which returns the resolved tokens for the Node layer to send
// best-effort. The pure helpers below (enum guard, data payload, message
// shaping) are what the apps and the route code agree on.
import { supabase } from '../db/supabase.js';
import { sendPushNotifications } from './pushNotifications.js';

export const FLEET_AUDIENCES = ['all_riders', 'online_riders', 'partners'] as const;
export type FleetAudience = (typeof FLEET_AUDIENCES)[number];

export function isFleetAudience(value: unknown): value is FleetAudience {
  return typeof value === 'string' && (FLEET_AUDIENCES as readonly string[]).includes(value);
}

// Which app receives it — the apps branch on data.kind to route the tap.
export function fleetPushKind(audience: FleetAudience): 'rider' | 'partner' {
  return audience === 'partners' ? 'partner' : 'rider';
}

export interface FleetPushMessage {
  to: string;
  title: string;
  body: string;
  priority: 'high';
  data: { type: 'admin_message'; kind: 'rider' | 'partner'; audience: FleetAudience };
}

// One Expo message per token. Blank/duplicate tokens are dropped so a rider
// signed in on two stale installs is not paged twice. High priority wakes a
// dozing Android phone; the OS shows it on the default channel when the app is
// backgrounded, and the in-app handler reads data.type when it is foregrounded.
export function fleetPushMessages(tokens: readonly string[], audience: FleetAudience, title: string, body: string): FleetPushMessage[] {
  const kind = fleetPushKind(audience);
  return [...new Set(tokens.filter((t): t is string => typeof t === 'string' && t.length > 0))].map((to) => ({
    to,
    title,
    body,
    priority: 'high',
    data: { type: 'admin_message', kind, audience },
  }));
}

export interface FleetPushResult {
  messageId: string;
  recipientCount: number;
  audience: FleetAudience;
}

// Records + resolves atomically in the RPC, then sends best-effort. A push
// failure never rolls back the audited send record, same contract as the
// customer push and riderDispatch.
export async function sendFleetPush(audience: FleetAudience, title: string, body: string, adminEmail: string): Promise<FleetPushResult> {
  const { data, error } = await supabase.rpc('admin_send_fleet_push', {
    p_audience: audience,
    p_title: title,
    p_body: body,
    p_admin_email: adminEmail,
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { message_id: string; recipient_count: number; tokens: string[] | null } | null;
  if (!row) throw new Error('admin_send_fleet_push returned no row');
  await sendPushNotifications(fleetPushMessages(row.tokens ?? [], audience, title.trim(), body.trim()));
  return { messageId: row.message_id, recipientCount: row.recipient_count, audience };
}
