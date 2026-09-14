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

// Route Handlers under app/api/* all read this before touching
// supabaseAdmin (service role) — middleware.ts already blocks an
// unauthenticated request from reaching here for normal browser
// navigation, but a direct API call (curl, a stale tab) bypasses the page
// redirect middleware.ts does, so each data-touching route re-checks for
// itself too. Returns the session or null; callers 401 on null.
export async function requireAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
