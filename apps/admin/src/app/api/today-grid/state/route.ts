// Master on/off for the grid on customer Home (takes effect immediately).
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { failed } from '../shared';

export async function PATCH(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const enabled = ((await request.json().catch(() => null)) as { enabled?: unknown } | null)?.enabled;
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'Send enabled: true or false.' }, { status: 400 });
  const { error } = await supabaseAdmin.from('today_grid_state')
    .upsert({ id: 1, enabled, updated_at: new Date().toISOString(), updated_by: actor.email });
  if (error) return failed('switch the grid', error);
  return NextResponse.json({ enabled });
}
