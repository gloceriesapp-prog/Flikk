import type { SmsHookConfig } from './config.js';

const SEND_SMS_URL = 'https://control.msg91.com/api/v5/flow';
const TIMEOUT_MS = 2500;
const MAX_RESPONSE_BYTES = 16 * 1024;

export class SmsDeliveryError extends Error {
  constructor(public readonly outcome: 'failed' | 'unknown') {
    super('SMS delivery was not confirmed.');
    this.name = 'SmsDeliveryError';
  }
}

async function readResponse(response: Response): Promise<unknown> {
  if (!response.body) throw new SmsDeliveryError('unknown');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new SmsDeliveryError('unknown');
      }
      chunks.push(next.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    reader.releaseLock();
  }
}

// Supabase generates and validates the OTP. MSG91 only transports that same code
// through the approved SMS template; do not use MSG91's separate OTP lifecycle.
export function createMsg91Client(config: SmsHookConfig, fetchImpl: typeof fetch = fetch) {
  return async (phone: string, otp: string): Promise<void> => {
    if (!/^\+91[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(otp)) throw new SmsDeliveryError('failed');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(SEND_SMS_URL, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { accept: 'application/json', 'content-type': 'application/json', authkey: config.authKey },
        body: JSON.stringify({
          template_id: config.templateId, short_url: '0',
          recipients: [{ mobiles: phone.slice(1), [config.otpVariable]: otp }],
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new SmsDeliveryError(response.status >= 500 ? 'unknown' : 'failed');
      }
      const body = await readResponse(response);
      if (!body || typeof body !== 'object') throw new SmsDeliveryError('unknown');
      const result = body as { type?: unknown; message?: unknown };
      if (result.type === 'error') throw new SmsDeliveryError('failed');
      if (result.type !== 'success' || typeof result.message !== 'string' || result.message.length < 1 || result.message.length > 256) {
        throw new SmsDeliveryError('unknown');
      }
    } catch (error) {
      // Timeouts and connection failures may occur after provider acceptance.
      // No blind retries: the signed event receipt prevents duplicate sends.
      throw error instanceof SmsDeliveryError ? error : new SmsDeliveryError('unknown');
    } finally {
      clearTimeout(timeout);
    }
  };
}
