import { createHash, randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export async function storePrivateDocument(input: { bucket: 'rider-documents' | 'store-documents'; ownerId: string; kind: string; bytes: Buffer }) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.ownerId) ||
      !/^[a-z][a-z-]{0,30}$/.test(input.kind) || !['rider-documents', 'store-documents'].includes(input.bucket) ||
      !Buffer.isBuffer(input.bytes) || input.bytes.length < 3 || input.bytes.length > 5 * 1024 * 1024 ||
      input.bytes[0] !== 0xff || input.bytes[1] !== 0xd8 || input.bytes[2] !== 0xff)
    throw new AppError(400, 'INVALID_DOCUMENT', 'Choose a valid document image under 5MB.');
  const id = randomUUID();
  const path = `${input.ownerId}/${input.kind}-${id}.jpg`;
  const metadata = { id, provider: 'supabase', visibility: 'private', bucket: input.bucket, object_key: path,
    public_url: null, purpose: input.bucket, content_type: 'image/jpeg', byte_size: input.bytes.length,
    sha256: createHash('sha256').update(input.bytes).digest('hex'), uploaded_by: input.ownerId, status: 'pending' };
  const { error: pendingError } = await supabase.from('media_assets').insert(metadata);
  if (pendingError) throw new AppError(503, 'MEDIA_METADATA_FAILED', 'Document storage is temporarily unavailable.');
  try {
    const { error } = await supabase.storage.from(input.bucket).upload(path, input.bytes, { contentType: 'image/jpeg', upsert: false });
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
