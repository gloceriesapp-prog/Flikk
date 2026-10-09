import { createHmac } from 'node:crypto';
import { supabase } from '../../db/supabase.js';
import { env } from '../../config/env.js';
import type { SmsReceipts } from './hook.js';

// Keyed hashes resist offline enumeration of phone numbers and OTP payloads.
// Keep AUTH_BUDGET_SECRET stable across replicas and during hook secret rotation.
function key(kind: string, value: string): string {
  return createHmac('sha256', process.env.AUTH_BUDGET_SECRET || env.supabaseServiceRoleKey)
    .update(`sms:${kind}:${value}`).digest('hex');
}

export const smsReceipts: SmsReceipts = {
  async claim(eventId, payloadHash, phone) {
    const { data, error } = await supabase.rpc('claim_send_sms_delivery', {
      p_event_key: key('event', eventId), p_payload_hash: key('payload', payloadHash),
      p_phone_key: key('phone', phone), p_global_limit: env.sms.perMinuteLimit,
      p_daily_limit: env.sms.perDayLimit,
    }).abortSignal(AbortSignal.timeout(650));
    if (error || !['claimed', 'sent', 'blocked'].includes(data)) throw new Error('SMS receipt unavailable.');
    return data as 'claimed' | 'sent' | 'blocked';
  },
  async finish(eventId, status) {
    const { error } = await supabase.rpc('finish_send_sms_delivery', {
      p_event_key: key('event', eventId), p_status: status,
    }).abortSignal(AbortSignal.timeout(650));
    if (error) throw new Error('SMS receipt unavailable.');
  },
};

export async function pruneSmsReceipts(): Promise<void> {
  if (!env.sms.enabled) return;
  const { error } = await supabase.rpc('prune_send_sms_deliveries');
  if (error) throw new Error('SMS receipt cleanup unavailable.');
}
