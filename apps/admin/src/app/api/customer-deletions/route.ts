import { requireAdminSession } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function GET(request: Request) {
  if (!await requireAdminSession()) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const before = new URL(request.url).searchParams.get('before');
  let query = supabaseAdmin.from('customer_deletion_requests').select('id,customer_id,status,reason,review_note,created_at,completed_at,users!customer_id(name,phone)');
  if (before) {
    try {
      const row = JSON.parse(Buffer.from(before, 'base64url').toString());
      if (typeof row.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T[0-9:.+Z-]+$/.test(row.at) || !Number.isFinite(Date.parse(row.at)) || typeof row.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(row.id)) throw new Error();
      query = query.or(`created_at.lt.${row.at},and(created_at.eq.${row.at},id.lt.${row.id})`);
    } catch { return Response.json({ error: 'Invalid page cursor.' }, { status: 400 }); }
  }
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(26);
  if (error) return Response.json({ error: 'Could not load deletion requests.' }, { status: 503 });
  const items = (data ?? []).slice(0, 25); const last = items.at(-1);
  return Response.json({ items, nextCursor: data && data.length > 25 && last ? Buffer.from(JSON.stringify({ at: last.created_at, id: last.id })).toString('base64url') : null });
}
