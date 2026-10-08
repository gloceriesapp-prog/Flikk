import { logger } from '../lib/logger.js';
import { supabase } from '../db/supabase.js';
// Database leases allow multiple backend instances to drain the same outbox.
interface NotificationJob {
    id: string;
    customer_id: string;
    // Null for an admin message (migration 117: admin_message_id instead).
    order_id: string | null;
    trip_id: string | null;
    title: string;
    body: string;
    attempts: number;
    lease_token: string;
}
let schemaRetryAfter = 0;
// Before migration 117 there is no last_error column; keep sending without it.
let lastErrorColumn = true;
// Order updates open the order; admin messages (no order) only open the inbox.
export function pushData(row: Pick<NotificationJob, 'id' | 'customer_id' | 'order_id' | 'trip_id'>) {
    if (!row.order_id && !row.trip_id)
        return { type: 'announcement', customer_id: row.customer_id, notification_id: row.id };
    return { type: 'order', customer_id: row.customer_id, notification_id: row.id, order_id: row.trip_id ?? row.order_id, is_trip: !!row.trip_id };
}
export async function runCustomerNotifications() {
    if (Date.now() < schemaRetryAfter) return;
    const { data: rows, error } = await supabase.rpc('claim_customer_notifications', { p_limit: 50 });
    if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') {
            schemaRetryAfter = Date.now() + 300000;
            logger.warn('Customer notifications need migration 067; retrying in five minutes.');
            return;
        }
        throw error;
    }
    if (!rows?.length)
        return;
    const { data: devices, error: deviceError } = await supabase.from('customer_push_devices').select('customer_id,token,installation_id,revision').in('customer_id', [...new Set<string>(rows.map((r: {
            customer_id: string;
        }) => r.customer_id))]);
    if (deviceError)
        throw deviceError;
    // A retry (attempts > 1: an earlier claim already ran) must not resend to devices whose
    // Expo ticket was accepted last time; every accepted ticket is stored as a receipt row.
    const retryIds = rows.filter((r: NotificationJob) => r.attempts > 1).map((r: NotificationJob) => r.id);
    const delivered = new Set<string>();
    if (retryIds.length) {
        const { data: receipts, error: receiptLookupError } = await supabase.from('customer_push_receipts').select('notification_id,installation_id').in('notification_id', retryIds);
        if (receiptLookupError)
            throw receiptLookupError;
        for (const r of (receipts ?? []) as { notification_id: string; installation_id: string }[])
            delivered.add(`${r.notification_id}:${r.installation_id}`);
    }
    // Five bounded requests at once; no unbounded fan-out per active customer.
    for (let start = 0; start < rows.length; start += 5)
        await Promise.all(rows.slice(start, start + 5).map(async (row: NotificationJob) => {
            let failed = false;
            // Shown on the admin Push outbox page; never a token or payload.
            let lastError: string | null = null;
            const fail = (reason: string) => { failed = true; lastError = reason.slice(0, 300); };
            const active = (devices ?? []).filter(d => d.customer_id === row.customer_id && !d.token.startsWith('disabled:'));
            const tokens = active.filter(d => !delivered.has(`${row.id}:${d.installation_id}`));
            if (!active.length)
                lastError = 'No registered device';
            for (let i = 0; i < tokens.length; i += 100) {
                const batch = tokens.slice(i, i + 100);
                try {
                    const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
                        body: JSON.stringify(batch.map(d => ({ to: d.token, title: row.title, body: row.body, sound: 'default', data: pushData(row) }))) });
                    if (!response.ok)
                        throw new Error('Push provider unavailable');
                    const result = await response.json() as {
                        data?: {
                            status: string;
                            id?: string;
                            message?: string;
                            details?: {
                                error?: string;
                            };
                        }[];
                    };
                    if (!Array.isArray(result.data) || result.data.length !== batch.length)
                        throw new Error('Invalid push response');
                    for (let n = 0; n < batch.length; n++) {
                        const ticket = result.data[n]!;
                        if (ticket.status === 'ok' && ticket.id) {
                            const { error: receiptError } = await supabase.from('customer_push_receipts').upsert({
                                id: ticket.id, notification_id: row.id, customer_id: row.customer_id,
                                installation_id: batch[n]!.installation_id, device_revision: batch[n]!.revision,
                            }, { onConflict: 'id', ignoreDuplicates: true });
                            if (receiptError) throw receiptError;
                            continue;
                        }
                        if (ticket.details?.error === 'DeviceNotRegistered') {
                            const { error: removeError } = await supabase.from('customer_push_devices').delete().eq('customer_id', row.customer_id).eq('token', batch[n]!.token);
                            if (removeError)
                                throw removeError;
                        }
                        else
                            fail(`Push rejected: ${ticket.details?.error ?? ticket.message ?? 'unknown error'}`);
                    }
                }
                catch (error) {
                    fail(error instanceof Error ? error.message : 'Push provider unavailable');
                }
            }
            const outcome = { lease_token: null, lease_until: null,
                ...(failed ? { next_attempt_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** row.attempts)).toISOString() } : { push_sent_at: new Date().toISOString() }) };
            const save = (patch: Record<string, unknown>) => supabase.from('customer_notifications').update(patch).eq('id', row.id).eq('lease_token', row.lease_token);
            let { error: saveError } = await save(lastErrorColumn ? { ...outcome, last_error: lastError } : outcome);
            if (saveError && lastErrorColumn && saveError.code === 'PGRST204') {
                lastErrorColumn = false;
                ({ error: saveError } = await save(outcome));
            }
            if (saveError)
                throw saveError;
        }));
}
