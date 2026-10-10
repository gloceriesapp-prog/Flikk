// Decrypt-proxy for private KYC documents — the single server-side reader for
// the rider-documents / store-documents / private-documents buckets. KYC docs
// are AES-256-GCM encrypted at rest (migration 119), so a raw Supabase signed
// URL can no longer render them; this route downloads the object, decrypts it
// when `encrypted`, and STREAMS the plaintext image bytes (not a JSON URL).
// Legacy unencrypted rows stream through as-is. All reads are requireAdmin().
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isEncryptionConfigured, decryptDocument } from '../../../../../../../../packages/server-media/encryption.cjs';

const PRIVATE_BUCKETS = ['rider-documents', 'store-documents', 'private-documents'];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid document.' }, { status: 400, headers });

  const { data: row, error } = await supabaseAdmin
    .from('media_assets')
    .select('bucket, object_key, content_type, encrypted, enc_iv, enc_tag, wrapped_dek, wrap_iv, wrap_tag, kek_id')
    .eq('id', id)
    .eq('visibility', 'private')
    .eq('provider', 'supabase')
    .eq('status', 'ready')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Document unavailable. Retry shortly.' }, { status: 503, headers });
  if (!row || !PRIVATE_BUCKETS.includes(row.bucket)) return NextResponse.json({ error: 'Document not found.' }, { status: 404, headers });

  const download = await supabaseAdmin.storage.from(row.bucket).download(row.object_key);
  if (download.error || !download.data) return NextResponse.json({ error: 'Document unavailable. Retry shortly.' }, { status: 503, headers });
  let bytes: Buffer = Buffer.from(await download.data.arrayBuffer());

  if (row.encrypted) {
    if (!isEncryptionConfigured(process.env)) {
      console.error(`[media/private] DOC_ENCRYPTION_KEY not set — cannot decrypt encrypted document ${id}`);
      return NextResponse.json({ error: 'Document unavailable. Retry shortly.' }, { status: 500, headers });
    }
    try {
      bytes = decryptDocument(
        { ciphertext: bytes, encIv: row.enc_iv, encTag: row.enc_tag, wrappedDek: row.wrapped_dek, wrapIv: row.wrap_iv, wrapTag: row.wrap_tag, kekId: row.kek_id },
        process.env,
      );
    } catch (err) {
      console.error(`[media/private] decrypt failed for document ${id}`, err);
      return NextResponse.json({ error: 'Document unavailable. Retry shortly.' }, { status: 500, headers });
    }
  }

  // Copy into a fresh ArrayBuffer-backed view so the body type is a concrete
  // BodyInit (decryptDocument/Buffer can be ArrayBufferLike-backed).
  return new NextResponse(new Uint8Array(bytes), { status: 200, headers: { ...headers, 'Content-Type': row.content_type ?? 'application/octet-stream' } });
}
