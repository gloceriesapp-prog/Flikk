'use strict';
const { randomUUID, createHash } = require('node:crypto');
const { MediaError, publicFolder } = require('./policy.cjs');
async function uploadPublicImage(dependencies, input) {
  const folder = publicFolder(input.folder);
  const bytes = input.bytes;
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 5 * 1024 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP')
    throw new MediaError('INVALID_MEDIA', 'Upload a normalized WebP image under 5MB.', 400);
  if (input.scope && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.scope)) throw new MediaError('INVALID_MEDIA_SCOPE', 'Invalid image scope.', 400);
  const id = randomUUID();
  const objectKey = `${folder}/${input.scope ? input.scope + '/' : ''}${id}.webp`;
  const url = `${dependencies.config.publicBaseUrl}/${objectKey}`;
  const row = { id, provider: 'r2', bucket: dependencies.config.bucket, object_key: objectKey, public_url: url, purpose: folder,
    content_type: 'image/webp', byte_size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    uploaded_by: input.uploadedBy || null, status: 'pending', cleanup_pending: false };
  // Durable intent precedes the object write. If R2 times out after accepting
  // a PUT, the exact key remains discoverable for compensation/reconciliation.
  let pending;
  try { pending = await dependencies.db.from('media_assets').insert(row); } catch { throw new MediaError('MEDIA_METADATA_FAILED', 'Image storage is temporarily unavailable.'); }
  if (pending.error) throw new MediaError('MEDIA_METADATA_FAILED', 'Image storage is temporarily unavailable.');
  try {
    await dependencies.put(objectKey, bytes);
    await dependencies.verifyDelivery(url);
    const ready = await dependencies.db.from('media_assets').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', id);
    if (ready.error) throw new Error('Metadata finalization failed');
    return { url, assetId: id, objectKey, provider: 'r2' };
  } catch (error) {
    let cleanupPending = true;
    try { await dependencies.remove(objectKey); cleanupPending = false; } catch { /* durable pending intent retains recovery key */ }
    try { await dependencies.db.from('media_assets').update({ status: 'failed', cleanup_pending: cleanupPending, updated_at: new Date().toISOString() }).eq('id', id); } catch { /* pending intent still durable */ }
    if (error instanceof MediaError) throw error;
    throw new MediaError('MEDIA_UPLOAD_FAILED', 'Image could not be stored. Please retry.');
  }
}
module.exports = { uploadPublicImage };
