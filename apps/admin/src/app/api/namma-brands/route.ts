// Namma Brands cards (home_brand_cards, migration 20261127100000).
// GET: the saved cards, in order. PUT { cards }: replace them all in one
// transaction (save_home_brand_cards). Enable / schedule / header image live
// on the 'namma-brands' row in Home Sections. Service role, admin only.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';
import { MAX_NAMMA_CARDS, type NammaCard, type PillMode } from '@/lib/home/nammaBrands';

// Table / function missing: the migration hasn't been applied yet.
const PENDING = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);
const pending = () => NextResponse.json({ error: 'Namma Brands needs its database update first.', pending: true }, { status: 503 });

type Row = { brand_id: string; title: string | null; product_ids: string[]; pill_mode: PillMode; brands: { name: string } | null };

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.from('home_brand_cards')
    .select('brand_id, title, product_ids, pill_mode, brands(name)').order('sort_index');
  if (error) {
    if (PENDING.has(error.code ?? '')) return pending();
    console.error('Namma Brands read failed', { code: error.code });
    return NextResponse.json({ error: 'Could not load Namma Brands.' }, { status: 500 });
  }
  const cards: NammaCard[] = ((data ?? []) as unknown as Row[]).map((row) => ({
    brandId: row.brand_id, brandName: row.brands?.name ?? 'Brand', title: row.title ?? '',
    productIds: row.product_ids ?? [], pillMode: row.pill_mode,
  }));
  return NextResponse.json({ cards });
}

export async function PUT(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { cards?: unknown } | null;
  if (!Array.isArray(body?.cards) || body.cards.length > MAX_NAMMA_CARDS) {
    return NextResponse.json({ error: `Add up to ${MAX_NAMMA_CARDS} cards.` }, { status: 400 });
  }
  const cards = [];
  const seen = new Set<string>();
  for (const raw of body.cards as Record<string, unknown>[]) {
    const brandId = raw?.brandId;
    if (!isUuid(brandId)) return NextResponse.json({ error: 'Pick a brand for every card.' }, { status: 400 });
    if (seen.has(brandId)) return NextResponse.json({ error: 'Each brand can have only one card.' }, { status: 400 });
    seen.add(brandId);
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (title.length > 60) return NextResponse.json({ error: 'Card titles can be up to 60 characters.' }, { status: 400 });
    const productIds = Array.isArray(raw.productIds) ? raw.productIds.filter(isUuid).slice(0, 2) : [];
    const pillMode = raw.pillMode === 'lowest_price' ? 'lowest_price' : 'discount';
    cards.push({ brand_id: brandId, title: title || null, product_ids: productIds, pill_mode: pillMode });
  }
  const { error } = await supabaseAdmin.rpc('save_home_brand_cards', { p_cards: cards });
  if (error) {
    if (PENDING.has(error.code ?? '')) return pending();
    console.error('Namma Brands save failed', { code: error.code });
    return NextResponse.json({ error: 'Could not save Namma Brands.' }, { status: 500 });
  }
  return NextResponse.json({ saved: cards.length });
}
