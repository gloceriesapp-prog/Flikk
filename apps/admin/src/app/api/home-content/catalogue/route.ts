import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const tables = { products: 'products', categories: 'sub_categories', stores: 'stores' } as const;
  if (!kind || !(kind in tables))
    return NextResponse.json({ error: 'Unknown catalogue.' }, { status: 400 });
  const ids = params.get('ids')?.split(',').filter(Boolean) ?? [];
  if (ids.length > 100 || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id)))
    return NextResponse.json({ error: 'Invalid catalogue IDs.' }, { status: 400 });
  const offset = Number(params.get('offset') ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100_000)
    return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });
  const columns =
    kind === 'products'
      ? 'id, name, image_url, stock_status, stores(name)'
      : kind === 'categories'
        ? 'id, name, image_url, categories(name)'
        : 'id, name, photo_url';
  let query = supabaseAdmin
    .from(tables[kind as keyof typeof tables])
    .select(columns)
    .order('name')
    .order('id');
  if (ids.length) query = query.in('id', ids).limit(100);
  else {
    const q = (params.get('q') ?? '').slice(0, 100).replace(/[\\%_]/g, '\\$&');
    if (q) query = query.ilike('name', `%${q}%`);
    if (kind === 'products') query = query.eq('approval_status', 'approved');
    query = query.range(offset, offset + 29);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load the catalogue.' }, { status: 503 });
  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    image_url?: string;
    photo_url?: string;
    stock_status?: string;
    stores?: { name: string };
    categories?: { name: string };
  }[];
  return NextResponse.json(
    {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url ?? row.photo_url ?? '',
        detail: [row.stores?.name ?? row.categories?.name, row.stock_status?.replaceAll('_', ' ')]
          .filter(Boolean)
          .join(' · '),
      })),
      nextOffset: !ids.length && rows.length === 30 ? offset + 30 : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
