import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { requireAdminSession } from '@/lib/supabase/server';

export async function GET() {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const { data, error } = await supabaseAdmin.from('rider_profile_change_requests')
    .select('id,user_id,changes,submitted_at,users(name,phone)')
    .eq('status', 'pending').order('submitted_at').limit(30);
  if (error) return NextResponse.json({ error: 'Could not load rider changes.' }, { status: 503 });
  const rows = data ?? [];
  const paths = rows.flatMap((row) => [row.changes.aadhaar_photo_url, row.changes.dl_photo_url])
    .filter((path): path is string => typeof path === 'string');
  const signed = paths.length ? await supabaseAdmin.storage.from('rider-documents').createSignedUrls(paths, 600) : { data: [], error: null };
  if (signed.error) return NextResponse.json({ error: 'Could not load private documents. Refresh before reviewing.' }, { status: 503 });
  const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
  return NextResponse.json(rows.map((row) => ({
    ...row,
    changes: { ...row.changes, aadhaar_photo_url: urls.get(row.changes.aadhaar_photo_url) ?? null,
      dl_photo_url: urls.get(row.changes.dl_photo_url) ?? null },
  })), { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (typeof body.id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.id)
      || typeof body.approve !== 'boolean' || (body.note !== undefined && typeof body.note !== 'string'))
      return NextResponse.json({ error: 'Invalid review.' }, { status: 400 });
    const note = body.note?.trim() ?? '';
    if (note.length > 500 || (!body.approve && note.length < 3))
      return NextResponse.json({ error: 'Enter a rejection reason of 3–500 characters.' }, { status: 400 });
    const admin = await requireAdminSession();
    if (!admin) return NextResponse.json({ error: 'Administrator access required.' }, { status: 401 });
    const { data, error } = await supabaseAdmin.rpc('review_rider_profile_change', {
      p_id: body.id, p_approve: body.approve, p_note: note, p_reviewer: admin.id,
    });
    if (error) return NextResponse.json({ error: 'Could not review the request. Refresh and retry.' }, { status: 409 });
    return NextResponse.json({ status: data });
  } catch { return NextResponse.json({ error: 'Invalid review request.' }, { status: 400 }); }
}
