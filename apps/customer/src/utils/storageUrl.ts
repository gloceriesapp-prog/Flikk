// Public Supabase Storage URLs for shipped app artwork. Built from
// EXPO_PUBLIC_SUPABASE_URL so a project move/staging build changes one env
// var, not every screen.
// ponytail: falls back to the current production project when the env var is
// unset (existing EAS profiles don't define it yet); drop the fallback once
// every build profile sets EXPO_PUBLIC_SUPABASE_URL.
const FALLBACK_SUPABASE_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co';
const BASE = (process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL).replace(/\/+$/, '');

/** `path` is `<bucket>/<object path>`, already URL-encoded. */
export function storageUrl(path: string): string {
  return `${BASE}/storage/v1/object/public/${path.replace(/^\/+/, '')}`;
}
