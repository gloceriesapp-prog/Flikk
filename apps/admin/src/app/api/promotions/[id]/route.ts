// Per-recipient delivery status for one campaign (promotional_deliveries).
// Shows the customer's name, never their phone/email destination (same rule
// as the backend's GET /admin/promotions/:id).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
import { isUuid } from '../../../../../../../packages/promotions/campaign.cjs';

interface DeliveryRow {
  id: string; customer_id: string; channel: string; status: string; attempts: number; updated_at: string;
  users: { name: string | null } | { name: string | null }[] | null;
}

export async function GET(_request: Request, ctx: RouteContext<'/api/promotions/[id]'>) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid campaign.' }, { status: 400 });
  try {
    const { data, error } = await supabaseAdmin.from('promotional_deliveries')
      .select('id, customer_id, channel, status, attempts, updated_at, users(name)')
      .eq('campaign_id', id).order('updated_at', { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json(((data ?? []) as unknown as DeliveryRow[]).map((row) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return { id: row.id, customerId: row.customer_id, customerName: user?.name ?? null, channel: row.channel,
        status: row.status, attempts: row.attempts, updatedAt: row.updated_at };
    }));
  } catch {
    return NextResponse.json({ error: 'Could not load delivery status.' }, { status: 500 });
  }
}
