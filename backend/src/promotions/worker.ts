import { supabase } from '../db/supabase.js';
import { promotionalPreferences } from '../notifications/preferences.js';
import { promotionsSwitchOn } from '../lib/platformSettings.js';
import { deliverPromotion, DeliveryError, providerReady, type Channel } from './providers.js';
interface Job { id: string; customer_id: string; channel: Channel; subject: string; body: string; lease_token: string; lease_until: string; attempts: number }
export async function runPromotions(shouldStop: () => boolean = () => false) {
  if (process.env.PROMOTIONS_ENABLED !== 'true') return { more: false };
  // Admin kill switch (Promotions page): checked before every claim, so
  // switching it off stops sending within one poll; queued jobs wait.
  if (!(await promotionsSwitchOn())) return { more: false };
  const { data, error } = await supabase.rpc('claim_promotional_deliveries', { p_limit: 1 });
  if (error) throw error;
  const jobs = (data ?? []) as Job[];
  // Small sequential batch limits auth/provider traffic per worker replica.
  for (const job of jobs) {
    if (shouldStop()) break;
    let status = 'failed';
    let providerId: string | null = null;
    try {
      if (!providerReady(job.channel)) throw new DeliveryError('failed', 'Provider not configured');
      const { data: account, error: accountError } = await supabase.auth.admin.getUserById(job.customer_id);
      if (accountError) throw new DeliveryError('uncertain', 'Account unavailable');
      const user = account.user;
      const destination = job.channel === 'sms' ? user?.phone : user?.email;
      const confirmed = job.channel === 'sms' ? user?.phone_confirmed_at : user?.email_confirmed_at;
      if (!user || !confirmed || !destination || !promotionalPreferences(user.user_metadata?.customer_promotional_preferences)[job.channel]) {
        status = 'skipped';
      } else {
        if (Date.parse(job.lease_until) - Date.now() < 20000) throw new DeliveryError('uncertain', 'Lease nearly expired');
        providerId = await deliverPromotion({ ...job, destination: job.channel === 'sms' ? `+${destination.replace(/^\+/, '')}` : destination });
        status = 'accepted'; // Provider acceptance is not proof of handset/inbox delivery.
      }
    } catch (error) {
      status = error instanceof DeliveryError ? error.outcome : 'uncertain';
      // Resend's stable key permits bounded retries; SMS uncertainty requires
      // provider reconciliation, never automatic retries that could duplicate.
      if (status === 'uncertain' && job.channel === 'email' && job.attempts < 5) status = 'queued';
    }
    const { error: finishError } = await supabase.from('promotional_deliveries').update({
      status, provider_id: providerId, lease_token: null, lease_until: null,
      available_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** job.attempts)).toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', job.id).eq('lease_token', job.lease_token).eq('status', 'sending');
    if (finishError) throw finishError;
  }
  return { more: jobs.length === 1 };
}
