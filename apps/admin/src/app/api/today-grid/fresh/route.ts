// Daily fresh inputs the grid's hero needs (migration 20261128130000):
//   fish: today's fish arrival time per shop (store_fresh_arrivals) -> "Landed 6:40 AM"
//   picked: mark village items picked today (products.picked_at) -> Village Fresh
// GET returns shops, village/fresh candidates and today's entries.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';

const FRESH_CATEGORIES = ['Fresh Vegetables', 'Fresh Fruits', 'Local & Seasonal'];
const PENDING = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);
const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const [stores, products, arrivals] = await Promise.all([
    supabaseAdmin.from('stores').select('id, name').eq('is_active', true).order('name'),
    supabaseAdmin.from('products').select('id, name, store_id, category, picked_at').in('category', FRESH_CATEGORIES).eq('approval_status', 'approved').order('name').limit(300),
    supabaseAdmin.from('store_fresh_arrivals').select('store_id, fish_arrived_at').eq('arrival_date', istToday()),
  ]);
  const error = stores.error ?? products.error ?? arrivals.error;
  if (error) {
    if (PENDING.has(error.code ?? '')) return NextResponse.json({ error: 'Needs migration 20261128130000 first.', pending: true }, { status: 503 });
    return NextResponse.json({ error: 'Could not load fresh inputs.' }, { status: 500 });
  }
  return NextResponse.json({ today: istToday(), stores: stores.data, products: products.data, arrivals: arrivals.data });
}

export async function POST(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.kind === 'fish') {
    const time = typeof body.time === 'string' ? /^(\d{2}):(\d{2})$/.exec(body.time) : null;
    if (!isUuid(body.storeId) || !time || Number(time[1]) > 23 || Number(time[2]) > 59) {
      return NextResponse.json({ error: 'Pick a shop and an arrival time.' }, { status: 400 });
    }
    const today = istToday();
    const { error } = await supabaseAdmin.from('store_fresh_arrivals').upsert({
      store_id: body.storeId, arrival_date: today, fish_arrived_at: new Date(`${today}T${body.time}:00+05:30`).toISOString(),
      updated_at: new Date().toISOString(), updated_by: actor.email,
    });
    if (error) return NextResponse.json({ error: 'Could not save the arrival time.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (body?.kind === 'picked') {
    const ids = Array.isArray(body.productIds) ? body.productIds.filter(isUuid).slice(0, 200) : [];
    if (!ids.length) return NextResponse.json({ error: 'Pick at least one item.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('products').update({ picked_at: body.picked === false ? null : new Date().toISOString() }).in('id', ids);
    if (error) return NextResponse.json({ error: 'Could not update the items.' }, { status: 500 });
    return NextResponse.json({ ok: true, count: ids.length });
  }
  return NextResponse.json({ error: 'Unknown update.' }, { status: 400 });
}
