// Public URLs for shipped app artwork (login hero, map pins, payment icons,
// placeholder). The artwork lives only in the production project's public
// buckets: it is static brand content, not user data, so every environment
// (local Supabase from `npm run local:setup`, staging, production) loads it
// from there. Building it from EXPO_PUBLIC_SUPABASE_URL blanked these images
// whenever the app pointed at a local or staging project.
// EXPO_PUBLIC_ARTWORK_BASE_URL overrides the host if the artwork ever moves.
const PRODUCTION_SUPABASE_URL = 'https://bjlknohjdnemxwwoxcsv.supabase.co';
const BASE = (process.env.EXPO_PUBLIC_ARTWORK_BASE_URL || PRODUCTION_SUPABASE_URL).replace(/\/+$/, '');

/** `path` is `<bucket>/<object path>`, already URL-encoded. */
export function storageUrl(path: string): string {
  return `${BASE}/storage/v1/object/public/${path.replace(/^\/+/, '')}`;
}
