import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { Webhook } from 'standardwebhooks';
import type { SmsHookConfig } from './config.js';
import { SmsDeliveryError } from './msg91.js';

export interface SmsReceipts {
  claim(eventId: string, payloadHash: string, phone: string): Promise<'claimed' | 'sent' | 'blocked'>;
  finish(eventId: string, status: 'sent' | 'failed' | 'unknown'): Promise<void>;
}
interface Dependencies {
  config: SmsHookConfig;
  receipts: SmsReceipts;
  send: (phone: string, otp: string) => Promise<void>;
}

function smsPayload(value: unknown): { phone: string; otp: string } | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as { user?: { phone?: unknown }; sms?: { otp?: unknown } };
  const rawPhone = input.user?.phone;
  const otp = input.sms?.otp;
  // Supabase versions may serialize phone with or without the leading plus.
  const phone = typeof rawPhone === 'string' ? `+${rawPhone.replace(/^\+/, '')}` : '';
  return /^\+91[6-9]\d{9}$/.test(phone) && typeof otp === 'string' && /^\d{6}$/.test(otp) ? { phone, otp } : null;
}

export function createSendSmsHookHandler({ config, receipts, send }: Dependencies): RequestHandler {
  const verifiers = config.enabled ? config.hookSecrets.map(secret => new Webhook(secret.replace(/^v1,/, ''))) : [];
  return async (req, res) => {
    const failure = (status: number, message: string) => res.status(status).json({ error: { http_code: status, message } });
    if (!config.enabled) { failure(503, 'SMS delivery is not configured.'); return; }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0 || req.body.length > 16 * 1024) {
      failure(400, 'Invalid SMS request.'); return;
    }
    const eventId = req.get('webhook-id') || '';
    const timestamp = req.get('webhook-timestamp') || '';
    const signature = req.get('webhook-signature') || '';
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(eventId) || !/^\d{10}$/.test(timestamp) || signature.length > 1024) {
      failure(401, 'Invalid SMS signature.'); return;
    }
    let verified = false;
    for (const verifier of verifiers) {
      try {
        verifier.verify(req.body, { 'webhook-id': eventId, 'webhook-timestamp': timestamp, 'webhook-signature': signature }, { jsonParse: false });
        verified = true;
        break;
      } catch { /* Do not log signature verification exceptions or raw payloads. */ }
    }
    if (!verified) { failure(401, 'Invalid SMS signature.'); return; }
    let payload: ReturnType<typeof smsPayload>;
    try { payload = smsPayload(JSON.parse(req.body.toString('utf8'))); }
    catch { failure(400, 'Invalid SMS request.'); return; }
    if (!payload) { failure(400, 'Invalid SMS request.'); return; }
    try {
      const claim = await receipts.claim(eventId, createHash('sha256').update(req.body).digest('hex'), payload.phone);
      if (claim === 'sent') { res.status(200).json({}); return; }
      if (claim !== 'claimed') { failure(429, 'Please wait before requesting another code.'); return; }
      let outcome: 'sent' | 'failed' | 'unknown' = 'sent';
      try { await send(payload.phone, payload.otp); }
      catch (error) { outcome = error instanceof SmsDeliveryError ? error.outcome : 'unknown'; }
      await receipts.finish(eventId, outcome);
      if (outcome !== 'sent') { failure(503, 'Could not send your code. Please try again later.'); return; }
      res.status(200).json({});
    } catch {
      // A failed receipt write must never turn an unconfirmed send into success.
      failure(503, 'Could not send your code. Please try again later.');
    }
  };
}
