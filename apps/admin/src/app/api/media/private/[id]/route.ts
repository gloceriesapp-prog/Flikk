import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid document.' }, { status: 400, headers });
  const { data, error } = await supabaseAdmin.from('media_assets').select('bucket,object_key').eq('id', id).eq('visibility', 'private').eq('provider', 'supabase').eq('status', 'ready').maybeSingle();
  if (error) return NextResponse.json({ error: 'Document unavailable. Retry shortly.' }, { status: 503, headers });
  if (!data || !['rider-documents', 'store-documents', 'private-documents'].includes(data.bucket)) return NextResponse.json({ error: 'Document not found.' }, { status: 404, headers });
  const signed = await supabaseAdmin.storage.from(data.bucket).createSignedUrl(data.object_key, 300);
  if (signed.error || !signed.data) return NextResponse.json({ error: 'Document unavailable. Retry shortly.' }, { status: 503, headers });
  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 300 }, { headers });
}
