import { supabase } from '../db/supabase.js';
import { removePublicImage } from './publicImages.js';
import { logger } from '../lib/logger.js';

interface Asset { id: string; provider: string; visibility: string; bucket: string; object_key: string; cleanup_token: string }
export async function cleanupMedia(shouldStop: () => boolean) {
  if (shouldStop()) return;
  const { data, error } = await supabase.rpc('claim_media_cleanup', { p_limit: 25 });
  if (error) throw new Error('Media cleanup claim failed');
  for (const asset of (data ?? []) as Asset[]) {
    if (shouldStop()) break;
    let success = false;
    try {
      if (asset.provider === 'r2' && asset.visibility === 'public') {
        await removePublicImage(asset.bucket, asset.object_key);
      } else if (asset.provider === 'supabase' && asset.visibility === 'private' &&
          ['rider-documents', 'store-documents', 'private-documents'].includes(asset.bucket)) {
        const removed = await supabase.storage.from(asset.bucket).remove([asset.object_key]);
        if (removed.error) throw new Error('Private cleanup failed');
      } else throw new Error('Unexpected media storage');
      success = true;
    } catch { logger.warn({ assetId: asset.id }, 'Media cleanup deferred'); }
    const completed = await supabase.rpc('complete_media_cleanup', { p_id: asset.id, p_token: asset.cleanup_token, p_success: success });
    if (completed.error) throw new Error('Media cleanup completion failed');
  }
}
