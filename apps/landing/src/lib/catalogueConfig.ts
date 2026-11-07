interface CatalogueEnvironment {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  VERCEL_ENV?: string;
  APP_ENV?: string;
}

export function catalogueConfig(env: CatalogueEnvironment): { url: string; anonKey: string } | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && anonKey) return { url, anonKey };
  if (env.VERCEL_ENV === 'production' || env.APP_ENV === 'production') {
    throw new Error('Production catalogue requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  // A preview without database access can still render the marketing/legal
  // pages. No live credentials or fake product data are substituted.
  return null;
}
