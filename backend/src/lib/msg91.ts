// MSG91 sends the login OTP SMS (customer, partner and rider apps). Supabase
// Auth still generates and verifies the code; the Send SMS hook
// (auth/sendSmsHook.ts) hands it to this module, which only delivers it
// through the DLT-approved OTP template. Delivery OTPs at the doorstep are a
// separate, in-app code (lib/deliveryOtp.ts) and never pass through here.
//
// Endpoint host is fixed, so configuration cannot redirect the request.
const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp';

export class SmsDeliveryError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'SmsDeliveryError';
  }
}

export interface Msg91Config {
  authKey?: string;
  templateId?: string;
}

export function msg91Config(): Msg91Config {
  return {
    authKey: process.env.MSG91_AUTH_KEY?.trim() || undefined,
    templateId: process.env.MSG91_OTP_TEMPLATE_ID?.trim() || undefined,
  };
}

// Supabase stores phones as digits without '+'. The DLT template and sender
// are registered for India only, so anything that is not +91 and ten digits
// is refused rather than sent to an unexpected destination.
export function msg91Mobile(phone: unknown): string {
  const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) throw new SmsDeliveryError(400, 'Only Indian mobile numbers can receive a login code.');
  return `91${local}`;
}

// Returns MSG91's request_id. MSG91 answers some failures with HTTP 200 and
// `type: "error"`, so the body decides success, not the status code alone.
export async function sendOtpSms(phone: unknown, otp: string, config = msg91Config()): Promise<string> {
  if (!config.authKey || !config.templateId) throw new SmsDeliveryError(503, 'SMS provider is not configured.');
  if (!/^\d{4,10}$/.test(otp)) throw new SmsDeliveryError(400, 'Invalid one-time code.');
  const url = new URL(MSG91_OTP_URL);
  url.searchParams.set('template_id', config.templateId);
  url.searchParams.set('mobile', msg91Mobile(phone));
  url.searchParams.set('otp', otp);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(4000), // inside Supabase's hook timeout
      headers: { authkey: config.authKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    });
  } catch {
    throw new SmsDeliveryError(504, 'SMS provider did not respond.');
  }
  const data = await response.json().catch(() => null) as { type?: unknown; request_id?: unknown; message?: unknown } | null;
  if (!response.ok || data?.type !== 'success') {
    // HTTP 401 here is almost always the authkey's IP whitelist in MSG91.
    throw new SmsDeliveryError(502,
      `SMS provider rejected the message (HTTP ${response.status}${typeof data?.message === 'string' ? `: ${data.message.slice(0, 120)}` : ''}).`);
  }
  return typeof data.request_id === 'string' ? data.request_id : '';
}
