// "Today on Gloceries" config (today_grid_config, migration 20261128130000):
// one JSONB row — slot table, backup order, per-card overrides, festival
// dates, rain switch — plus a master on/off. The backend parses it with the
// same packages/today-grid parser, so anything saved here is valid there.
// Service role, admin only.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { parseConfig } from '@/lib/home/todayGrid';

const PENDING = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
const pending = () => NextResponse.json({ error: 'Today grid needs its database update first (migration 20261128130000).', pending: true }, { status: 503 });

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('today_grid_config').select('enabled, config, updated_at, updated_by').eq('id', 1).maybeSingle();
  if (error) {
    if (PENDING.has(error.code ?? '')) return pending();
    console.error('Today grid read failed', { code: error.code });
    return NextResponse.json({ error: 'Could not load the Today grid.' }, { status: 500 });
  }
  return NextResponse.json({ enabled: data?.enabled !== false, config: parseConfig(data?.config), updatedAt: data?.updated_at ?? null, updatedBy: data?.updated_by ?? null });
}

export async function PUT(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { enabled?: unknown; config?: unknown } | null;
  if (typeof body?.enabled !== 'boolean' || !body.config || typeof body.config !== 'object') {
    return NextResponse.json({ error: 'Send the on/off switch and the grid settings.' }, { status: 400 });
  }
  // Store only what parses: unknown cards, bad times or colours are dropped.
  const config = parseConfig(body.config);
  if (config.festival.from && config.festival.to && config.festival.from > config.festival.to) {
    return NextResponse.json({ error: 'Festival end date must be on or after its start date.' }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from('today_grid_config')
    .upsert({ id: 1, enabled: body.enabled, config, updated_at: new Date().toISOString(), updated_by: actor.email });
  if (error) {
    if (PENDING.has(error.code ?? '')) return pending();
    console.error('Today grid save failed', { code: error.code });
    return NextResponse.json({ error: 'Could not save the Today grid.' }, { status: 500 });
  }
  return NextResponse.json({ enabled: body.enabled, config });
}
