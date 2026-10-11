// Resolve private-bucket object paths to the admin decrypt-proxy URL
// (/api/media/private/<media_assets.id>). KYC docs are now AES-256-GCM
// encrypted at rest (migration 119), so their bytes can no longer be viewed
// through a raw Supabase signed URL — they must go through the proxy, which
// downloads + decrypts server-side and streams the plaintext image.
//
// Each path is matched to its newest status='ready' media_assets row by
// object_key + bucket. Legacy paths that predate the media_assets ledger have
// no row; those fall back to a short-lived signed URL so nothing regresses
// (legacy objects are unencrypted, so a signed URL still renders them).
import { supabaseAdmin } from './admin';

export async function privateDocUrls(bucket: string, paths: (string | null)[], fallbackTtlSeconds = 3600): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return result;

  const { data } = await supabaseAdmin
    .from('media_assets')
    .select('id, object_key, created_at')
    .eq('provider', 'supabase')
    .eq('visibility', 'private')
    .eq('bucket', bucket)
    .eq('status', 'ready')
    .in('object_key', unique)
    .order('created_at', { ascending: false });

  // Ordered newest-first, so the first row seen per object_key is the newest.
  for (const row of (data ?? []) as { id: string; object_key: string }[]) {
    if (!result.has(row.object_key)) result.set(row.object_key, `/api/media/private/${row.id}`);
  }

  const missing = unique.filter((p) => !result.has(p));
  if (missing.length > 0) {
    const { data: signed } = await supabaseAdmin.storage.from(bucket).createSignedUrls(missing, fallbackTtlSeconds);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) result.set(s.path, s.signedUrl);
    }
  }
  return result;
}

export async function privateDocUrl(bucket: string, path: string, fallbackTtlSeconds = 3600): Promise<string | null> {
  const map = await privateDocUrls(bucket, [path], fallbackTtlSeconds);
  return map.get(path) ?? null;
}
