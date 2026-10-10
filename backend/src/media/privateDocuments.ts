import { createHash, randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { isEncryptionConfigured, encryptDocument, decryptDocument } from '../../../packages/server-media/encryption.cjs';

// Sensitive KYC kinds whose bytes must never be stored as plaintext. Rider
// 'profile' (avatar) is intentionally absent — it is not sensitive.
const ENCRYPTED_KINDS = new Set(['aadhaar', 'dl', 'payout-proof', 'pan', 'gst', 'fssai', 'shop-license', 'udyam']);

export async function storePrivateDocument(input: { bucket: 'rider-documents' | 'store-documents'; ownerId: string; kind: string; bytes: Buffer }) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.ownerId) ||
      !/^[a-z][a-z-]{0,30}$/.test(input.kind) || !['rider-documents', 'store-documents'].includes(input.bucket) ||
      !Buffer.isBuffer(input.bytes) || input.bytes.length < 3 || input.bytes.length > 5 * 1024 * 1024 ||
      input.bytes[0] !== 0xff || input.bytes[1] !== 0xd8 || input.bytes[2] !== 0xff)
    throw new AppError(400, 'INVALID_DOCUMENT', 'Choose a valid document image under 5MB.');
  const encrypt = ENCRYPTED_KINDS.has(input.kind);
  // Fail closed: a sensitive KYC document is never written as plaintext.
  if (encrypt && !isEncryptionConfigured(process.env))
    throw new AppError(503, 'ENCRYPTION_NOT_CONFIGURED', 'Document storage is temporarily unavailable.');
  const id = randomUUID();
  const path = `${input.ownerId}/${input.kind}-${id}.${encrypt ? 'enc' : 'jpg'}`;
  const envelope = encrypt ? encryptDocument(input.bytes, process.env) : null;
  const uploadBytes = envelope ? envelope.ciphertext : input.bytes;
  const uploadContentType = encrypt ? 'application/octet-stream' : 'image/jpeg';
  // content_type stays the ORIGINAL mime and byte_size the ORIGINAL length so
  // readers decrypt then serve as image/jpeg; sha256 hashes the plaintext.
  const metadata = { id, provider: 'supabase', visibility: 'private', bucket: input.bucket, object_key: path,
    public_url: null, purpose: input.bucket, content_type: 'image/jpeg', byte_size: input.bytes.length,
    sha256: createHash('sha256').update(input.bytes).digest('hex'), uploaded_by: input.ownerId, status: 'pending',
    encrypted: encrypt,
    ...(envelope ? { enc_algo: envelope.algo, enc_iv: envelope.encIv, enc_tag: envelope.encTag,
      wrapped_dek: envelope.wrappedDek, wrap_iv: envelope.wrapIv, wrap_tag: envelope.wrapTag, kek_id: envelope.kekId } : {}) };
  const { error: pendingError } = await supabase.from('media_assets').insert(metadata);
  if (pendingError) throw new AppError(503, 'MEDIA_METADATA_FAILED', 'Document storage is temporarily unavailable.');
  try {
    const { error } = await supabase.storage.from(input.bucket).upload(path, uploadBytes, { contentType: uploadContentType, upsert: false });
    if (error) throw new Error('Private upload failed');
    const ready = await supabase.from('media_assets').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', id);
    if (ready.error) throw new Error('Document metadata failed');
    return { path, assetId: id, provider: 'supabase' };
  } catch {
    let cleanupPending = true;
    try { const removed = await supabase.storage.from(input.bucket).remove([path]); cleanupPending = Boolean(removed.error); } catch { /* intent persists */ }
    try { await supabase.from('media_assets').update({ status: 'failed', cleanup_pending: cleanupPending, updated_at: new Date().toISOString() }).eq('id', id); } catch { /* intent persists */ }
    throw new AppError(503, 'DOCUMENT_UPLOAD_FAILED', 'Document could not be stored. Please retry.');
  }
}

// Reads a stored private document for trusted service routes: downloads via the
// service-role client and transparently decrypts envelope-encrypted assets.
// Returns the ORIGINAL content type so callers serve the plaintext correctly.
export async function readPrivateDocument(mediaAsset: {
  bucket: string; object_key: string; content_type: string; encrypted?: boolean | null;
  enc_iv?: string | null; enc_tag?: string | null; wrapped_dek?: string | null;
  wrap_iv?: string | null; wrap_tag?: string | null; kek_id?: string | null;
}): Promise<{ bytes: Buffer; contentType: string }> {
  const { data, error } = await supabase.storage.from(mediaAsset.bucket).download(mediaAsset.object_key);
  if (error || !data) throw new AppError(503, 'DOCUMENT_UNAVAILABLE', 'Document could not be retrieved.');
  const downloaded = Buffer.from(await data.arrayBuffer());
  if (!mediaAsset.encrypted) return { bytes: downloaded, contentType: mediaAsset.content_type };
  const bytes = decryptDocument({
    ciphertext: downloaded,
    encIv: mediaAsset.enc_iv!, encTag: mediaAsset.enc_tag!,
    wrappedDek: mediaAsset.wrapped_dek!, wrapIv: mediaAsset.wrap_iv!, wrapTag: mediaAsset.wrap_tag!,
    kekId: mediaAsset.kek_id ?? undefined,
  }, process.env);
  return { bytes, contentType: mediaAsset.content_type };
}
