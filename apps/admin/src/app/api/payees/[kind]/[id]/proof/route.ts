// 60-second signed URL for a payee's bank proof (cancelled cheque /
// passbook photo, payout_proof_path). Stores upload to the private
// store-documents bucket, riders to rider-documents — same buckets the
// onboarding documents use (backend/src/media/privateDocuments.ts).
// [id] = stores.id for a store, users.id (riders.user_id) for a rider.

import { NextResponse } from 'next/server';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseKindAndId } from '@/lib/payoutValidation';

export async function GET(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const headers = { 'Cache-Control': 'private, no-store' };

  const { kind, id } = await context.params;
  const target = parseKindAndId(kind, id);
  if (!target) return NextResponse.json({ error: 'Invalid payee.' }, { status: 400, headers });

  const { data, error } =
    target.kind === 'store'
      ? await supabaseAdmin.from('stores').select('payout_proof_path').eq('id', target.id).maybeSingle()
      : await supabaseAdmin.from('riders').select('payout_proof_path').eq('user_id', target.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Proof unavailable. Retry shortly.' }, { status: 503, headers });
  const path = (data as { payout_proof_path: string | null } | null)?.payout_proof_path;
  if (!path) return NextResponse.json({ error: 'No proof uploaded.' }, { status: 404, headers });

  const bucket = target.kind === 'store' ? 'store-documents' : 'rider-documents';
  const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60);
  if (signed.error || !signed.data) return NextResponse.json({ error: 'Proof unavailable. Retry shortly.' }, { status: 503, headers });
  return NextResponse.json({ url: signed.data.signedUrl, expiresIn: 60 }, { headers });
}
