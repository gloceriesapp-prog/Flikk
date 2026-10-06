import { requireAdminSession } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function GET(request: Request) {
  if (!await requireAdminSession()) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const after = new URL(request.url).searchParams.get('after');
  if (after && !uuid(after)) return Response.json({ error: 'Invalid page.' }, { status: 400 });
  let query = supabaseAdmin.from('products').select('id,name,stock_quantity,stock_tracking_enabled,product_variants(id,unit_type,quantity,stock_quantity)').order('id').limit(26);
  if (after) query = query.gt('id', after);
  const { data, error } = await query;
  if (error) return Response.json({ error: 'Could not load pack counts.' }, { status: 503 });
  const items = (data ?? []).slice(0, 25);
  return Response.json({ items, nextCursor: data && data.length > 25 ? items.at(-1)!.id : null });
}
export async function PATCH(request: Request) {
  if (!await requireAdminSession()) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !uuid(body.productId) || (body.variantId !== null && !uuid(body.variantId)) || !Number.isSafeInteger(body.quantity) || body.quantity < 0 || body.quantity > 1000000)
    return Response.json({ error: 'Enter a valid available pack count.' }, { status: 400 });
  const { error } = await supabaseAdmin.rpc('set_product_pack_stock', { p_product: body.productId, p_variant: body.variantId, p_quantity: body.quantity });
  if (error) return Response.json({ error: 'Could not save this pack count.' }, { status: 409 });
  return Response.json({ ok: true });
}
