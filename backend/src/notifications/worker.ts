import { logger } from '../lib/logger.js';
import { supabase } from '../db/supabase.js';
// Database leases allow multiple backend instances to drain the same outbox.
interface NotificationJob {
    id: string;
    customer_id: string;
    order_id: string;
    trip_id: string | null;
    title: string;
    body: string;
    attempts: number;
    lease_token: string;
}
let schemaRetryAfter = 0;
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
    // Five bounded requests at once; no unbounded fan-out per active customer.
    for (let start = 0; start < rows.length; start += 5)
        await Promise.all(rows.slice(start, start + 5).map(async (row: NotificationJob) => {
            let failed = false;
            const tokens = (devices ?? []).filter(d => d.customer_id === row.customer_id && !d.token.startsWith('disabled:'));
            for (let i = 0; i < tokens.length; i += 100) {
                const batch = tokens.slice(i, i + 100);
                try {
                    const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
                        body: JSON.stringify(batch.map(d => ({ to: d.token, title: row.title, body: row.body, sound: 'default', data: { type: 'order', customer_id: row.customer_id, notification_id: row.id, order_id: row.trip_id ?? row.order_id, is_trip: !!row.trip_id } }))) });
                    if (!response.ok)
                        throw new Error('Push provider unavailable');
                    const result = await response.json() as {
                        data?: {
                            status: string;
                            id?: string;
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
                            failed = true;
                    }
                }
                catch {
                    failed = true;
                }
            }
            const { error: saveError } = await supabase.from('customer_notifications').update({ lease_token: null, lease_until: null,
                ...(failed ? { next_attempt_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** row.attempts)).toISOString() } : { push_sent_at: new Date().toISOString() }) })
                .eq('id', row.id).eq('lease_token', row.lease_token);
            if (saveError)
                throw saveError;
        }));
}
