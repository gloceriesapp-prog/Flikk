export type Channel = 'sms' | 'email';
export interface PromotionalMessage { id: string; channel: Channel; destination: string; subject: string; body: string }
export class DeliveryError extends Error {
  constructor(public outcome: 'failed' | 'uncertain', message: string) { super(message); }
}
export function providerReady(channel: Channel): boolean {
  if (process.env.PROMOTIONS_ENABLED !== 'true') return false;
  return channel === 'email'
    ? !!process.env.RESEND_API_KEY && !!process.env.PROMOTIONAL_EMAIL_FROM
    : !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_MESSAGING_SERVICE_SID;
}
// Endpoint hosts are fixed; configuration cannot turn this into an SSRF proxy.
export async function deliverPromotion(message: PromotionalMessage): Promise<string> {
  if (!providerReady(message.channel)) throw new DeliveryError('failed', 'Provider not configured');
  let response: Response;
  try {
    if (message.channel === 'email') {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `promotion/${message.id}` },
        body: JSON.stringify({ from: process.env.PROMOTIONAL_EMAIL_FROM, to: [message.destination], subject: message.subject, text: message.body }),
      });
    } else {
      const sid = process.env.TWILIO_ACCOUNT_SID!;
      if (!/^AC[0-9a-f]{32}$/i.test(sid)) throw new DeliveryError('failed', 'Invalid SMS configuration');
      response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: message.destination, MessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!, Body: message.body }),
      });
    }
  } catch (error) {
    if (error instanceof DeliveryError) throw error;
    throw new DeliveryError('uncertain', 'Provider response unavailable');
  }
  if (!response.ok) throw new DeliveryError(response.status >= 500 ? 'uncertain' : 'failed', 'Provider did not accept message');
  try {
    const data = await response.json() as { id?: string; sid?: string };
    const id = message.channel === 'email' ? data.id : data.sid;
    if (typeof id !== 'string' || !id.length) throw new Error('Missing provider ID');
    return id;
  } catch { throw new DeliveryError('uncertain', 'Provider acknowledgement unavailable'); }
}
