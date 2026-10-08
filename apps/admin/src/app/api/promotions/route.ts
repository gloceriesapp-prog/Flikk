// Promotions page data. Writes the same promotional_deliveries rows the
// backend's POST /admin/promotions writes (backend/src/promotions/router.ts),
// validated by the same shared rule (packages/promotions/campaign.cjs), so
// the backend worker sends them identically: it rechecks each customer's
// confirmed contact and saved opt-out right before sending, and only sends
// while platform_settings.promotions_enabled (toggled here) AND the backend's
// PROMOTIONS_ENABLED env var with provider keys are on.
//
// GET: kill-switch state + past campaigns (promotional_campaigns RPC, 112).
// POST: queue a campaign for explicit customers (up to 100).
// PATCH: turn the kill switch on/off.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { CampaignError, deliveryRows, parseCampaign } from '../../../../../../packages/promotions/campaign.cjs';

interface CampaignRow {
  campaign_id: string; channel: 'sms' | 'email'; subject: string; body: string; created_at: string; updated_at: string;
  recipients: number; queued: number; sending: number; accepted: number; skipped: number; failed: number; uncertain: number;
}

async function readSwitch(): Promise<{ id: string; enabled: boolean }> {
  const { data, error } = await supabaseAdmin.from('platform_settings').select('id, promotions_enabled').limit(1).single();
  if (error) throw error;
  return { id: data.id as string, enabled: data.promotions_enabled === true };
}

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const [settings, campaigns] = await Promise.all([readSwitch(), supabaseAdmin.rpc('promotional_campaigns', { p_limit: 50 })]);
    if (campaigns.error) throw campaigns.error;
    return NextResponse.json({
      promotionsEnabled: settings.enabled,
      campaigns: ((campaigns.data ?? []) as CampaignRow[]).map((row) => ({
        campaignId: row.campaign_id, channel: row.channel, subject: row.subject, body: row.body,
        createdAt: row.created_at, updatedAt: row.updated_at,
        counts: {
          recipients: Number(row.recipients), queued: Number(row.queued), sending: Number(row.sending), accepted: Number(row.accepted),
          skipped: Number(row.skipped), failed: Number(row.failed), uncertain: Number(row.uncertain),
        },
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Could not load promotions.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  let campaign;
  try {
    campaign = parseCampaign(await request.json());
  } catch (err) {
    const message = err instanceof CampaignError ? err.message : 'Send a valid campaign.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  try {
    if (!(await readSwitch()).enabled) {
      return NextResponse.json({ error: 'Promotions are switched off. Turn them on above first.' }, { status: 409 });
    }
    const { data: customers, error: customerError } = await supabaseAdmin
      .from('users').select('id').in('id', campaign.customerIds).eq('role', 'customer');
    if (customerError) throw customerError;
    if (customers?.length !== campaign.customerIds.length) {
      return NextResponse.json({ error: 'Select existing customer accounts.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('promotional_deliveries')
      .upsert(deliveryRows(campaign), { onConflict: 'campaign_id,customer_id,channel', ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ campaignId: campaign.campaignId, recipients: campaign.customerIds.length }, { status: 202 });
  } catch {
    return NextResponse.json({ error: 'Could not queue the campaign. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await request.json();
    if (typeof body?.promotionsEnabled !== 'boolean') {
      return NextResponse.json({ error: 'promotionsEnabled must be true or false.' }, { status: 400 });
    }
    const current = await readSwitch();
    const { data, error } = await supabaseAdmin.from('platform_settings')
      .update({ promotions_enabled: body.promotionsEnabled, updated_at: new Date().toISOString() })
      .eq('id', current.id).select('promotions_enabled').single();
    if (error) throw error;
    return NextResponse.json({ promotionsEnabled: data.promotions_enabled === true });
  } catch {
    return NextResponse.json({ error: 'Could not change the promotions switch.' }, { status: 500 });
  }
}
