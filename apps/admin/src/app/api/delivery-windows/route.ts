// Settings → Delivery time by category. GET: saved windows + every product
// category in use (incl. ones with no Categories row, e.g. "Non Veg").
// PUT: replaces the whole list (rows left out are removed).
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { validateDeliveryWindows } from '@/lib/deliveryWindows';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SELECT = 'category, min_minutes, max_minutes, note';
type Row = { category: string; min_minutes: number; max_minutes: number; note: string | null };
const toWindow = (row: Row) => ({ category: row.category, minMinutes: row.min_minutes, maxMinutes: row.max_minutes, note: row.note });

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const [windows, products] = await Promise.all([
    supabaseAdmin.from('category_delivery_windows').select(SELECT).order('category'),
    supabaseAdmin.from('products').select('category'),
  ]);
  if (windows.error) return NextResponse.json({ error: 'Delivery times by category need the database update (migration 20261129090000).' }, { status: 503 });
  if (products.error) return NextResponse.json({ error: 'Could not load product categories.' }, { status: 500 });
  const categories = [...new Set(((products.data ?? []) as { category: string | null }[]).map((p) => p.category?.trim()).filter((c): c is string => !!c))].sort();
  return NextResponse.json({ windows: ((windows.data ?? []) as Row[]).map(toWindow), categories });
}

export async function PUT(request: Request) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  let windows;
  try { windows = validateDeliveryWindows(await request.json()); } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid input.' }, { status: 400 });
  }
  const current = await supabaseAdmin.from('category_delivery_windows').select('category');
  if (current.error) return NextResponse.json({ error: 'Could not load the saved delivery times.' }, { status: 500 });
  const keep = new Set(windows.map((w) => w.category));
  const removed = ((current.data ?? []) as { category: string }[]).map((r) => r.category).filter((c) => !keep.has(c));
  if (removed.length) {
    const { error } = await supabaseAdmin.from('category_delivery_windows').delete().in('category', removed);
    if (error) return NextResponse.json({ error: 'Could not remove delivery times.' }, { status: 500 });
  }
  if (windows.length) {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('category_delivery_windows').upsert(windows.map((w) => ({
      category: w.category, min_minutes: w.minMinutes, max_minutes: w.maxMinutes, note: w.note, updated_at: now, updated_by: actor.email,
    })));
    if (error) return NextResponse.json({ error: 'Could not save delivery times.' }, { status: 500 });
  }
  const saved = await supabaseAdmin.from('category_delivery_windows').select(SELECT).order('category');
  return NextResponse.json({ windows: ((saved.data ?? []) as Row[]).map(toWindow) });
}
