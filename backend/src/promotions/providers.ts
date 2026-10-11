export type Channel = 'sms' | 'email';
export interface PromotionalMessage { id: string; channel: Channel; destination: string; subject: string; body: string }
export class DeliveryError extends Error {
  constructor(public outcome: 'failed' | 'uncertain', message: string) { super(message); }
}
// Promotional SMS has no provider. Indian DLT rules only allow pre-approved
// promotional templates from a registered promotional header, and campaigns
// here are free text, so SMS is permanently "not configured" until a
// template-based MSG91 promotional flow exists — distinct from email merely
// being switched off. Login OTPs use lib/msg91.ts instead.
export type ChannelStatus = 'ready' | 'disabled' | 'sms_not_configured';
export function promotionChannelStatus(channel: Channel): ChannelStatus {
  if (channel === 'sms') return 'sms_not_configured';
  if (process.env.PROMOTIONS_ENABLED !== 'true') return 'disabled';
  return !!process.env.RESEND_API_KEY && !!process.env.PROMOTIONAL_EMAIL_FROM ? 'ready' : 'disabled';
}
export function providerReady(channel: Channel): boolean {
  return promotionChannelStatus(channel) === 'ready';
}
// Endpoint hosts are fixed; configuration cannot turn this into an SSRF proxy.
export async function deliverPromotion(message: PromotionalMessage): Promise<string> {
  if (!providerReady(message.channel)) throw new DeliveryError('failed', 'Provider not configured');
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `promotion/${message.id}` },
      body: JSON.stringify({ from: process.env.PROMOTIONAL_EMAIL_FROM, to: [message.destination], subject: message.subject, text: message.body }),
    });
  } catch (error) {
    if (error instanceof DeliveryError) throw error;
    throw new DeliveryError('uncertain', 'Provider response unavailable');
  }
  if (!response.ok) throw new DeliveryError(response.status >= 500 ? 'uncertain' : 'failed', 'Provider did not accept message');
  try {
    const { id } = await response.json() as { id?: string };
    if (typeof id !== 'string' || !id.length) throw new Error('Missing provider ID');
    return id;
  } catch { throw new DeliveryError('uncertain', 'Provider acknowledgement unavailable'); }
}
