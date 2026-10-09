// MSG91 sends the login OTP SMS (customer, partner and rider apps). Supabase
// Auth still generates and verifies the code; the Send SMS hook
// (auth/sendSmsHook.ts) hands it to this module, which only delivers it
// through the DLT-approved template. Delivery OTPs at the doorstep are a
// separate, in-app code (lib/deliveryOtp.ts) and never pass through here.
//
// Default is MSG91's SMS Flow API: it sends the SMS-section template
// (MSG91 -> SMS -> Templates, "Verified by DLT") and fills its ##OTP##
// variable. MSG91's OTP API only applies templates made under MSG91 -> OTP;
// given an SMS template it sends without one, which operators drop.
// MSG91_API=otp switches to the OTP API for an OTP-section template.
//
// Endpoint hosts are fixed, so configuration cannot redirect the request.
const MSG91_FLOW_URL = 'https://control.msg91.com/api/v5/flow';
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
  api: 'flow' | 'otp';
  // Name of the template variable that holds the code: ##OTP## -> "OTP".
  otpVariable: string;
}

export function msg91Config(): Msg91Config {
  const variable = process.env.MSG91_OTP_VARIABLE?.trim().replace(/^#+|#+$/g, '');
  return {
    authKey: process.env.MSG91_AUTH_KEY?.trim() || undefined,
    templateId: process.env.MSG91_OTP_TEMPLATE_ID?.trim() || undefined,
    api: process.env.MSG91_API?.trim().toLowerCase() === 'otp' ? 'otp' : 'flow',
    otpVariable: variable && /^[A-Za-z0-9_]{1,40}$/.test(variable) ? variable : 'OTP',
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

// Returns MSG91's request id. MSG91 answers some failures with HTTP 200 and
// `type: "error"`, so the body decides success, not the status code alone.
export async function sendOtpSms(phone: unknown, otp: string, config = msg91Config()): Promise<string> {
  if (!config.authKey || !config.templateId) throw new SmsDeliveryError(503, 'SMS provider is not configured.');
  if (!/^\d{4,10}$/.test(otp)) throw new SmsDeliveryError(400, 'Invalid one-time code.');
  const mobile = msg91Mobile(phone);
  let url: URL;
  let body: string;
  if (config.api === 'otp') {
    url = new URL(MSG91_OTP_URL);
    url.searchParams.set('template_id', config.templateId);
    url.searchParams.set('mobile', mobile);
    url.searchParams.set('otp', otp);
    body = '{}';
  } else {
    url = new URL(MSG91_FLOW_URL);
    body = JSON.stringify({
      template_id: config.templateId,
      short_url: '0',
      recipients: [{ mobiles: mobile, [config.otpVariable]: otp }],
    });
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(4000), // inside Supabase's hook timeout
      headers: { authkey: config.authKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
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
  // Flow returns the request id in `message`; the OTP API in `request_id`.
  const id = typeof data.request_id === 'string' ? data.request_id : typeof data.message === 'string' ? data.message : '';
  return id.slice(0, 64);
}
