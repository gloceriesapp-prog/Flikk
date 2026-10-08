// Server-side Supabase client for reading the signed-in session (anon
// key, RLS-respecting — NOT the service-role client, see lib/supabase/
// admin.ts's own note on why writes use that one instead). Used by Route
// Handlers/Server Components that need to know WHO is asking, e.g.
// requireAdminSession() below. Reads/writes the session via Next's own
// cookies() so it sees exactly the same session the browser client
// (lib/supabase/client.ts's createBrowserClient) set.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Route Handlers can write cookies; plain Server Components
          // can't (Next throws here) — harmless when middleware.ts is
          // already refreshing the session on every request.
        }
      },
    },
  });
}

// Returns the signed-in Supabase user or null. It does NOT check the admin
// email allowlist — Route Handlers must use requireAdmin()
// (lib/auth/requireAdmin.ts) and Server Components requireAdminPage()
// (lib/auth/requireAdminPage.ts), which build on this.
export async function requireAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
