// Client-side auth guard for every page under (dashboard)/ — checks for a
// stored token, confirms it's actually a store_owner via GET /auth/me
// (role/approval aren't in the JWT, same reasoning that route's own
// comment documents), and redirects to /login otherwise. No SSR session
// check (this is a client component hook, not middleware) — same
// deliberate trade-off authStorage.ts's own note makes for shipping fast;
// a logged-out flash before the redirect fires is an acceptable cost here.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, type Me } from './authApi';
import { clearTokens, getAccessToken } from './authStorage';

interface SessionState {
  me: Me | null;
  isLoading: boolean;
}

export function useSession(): SessionState {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getAccessToken()) {
        router.replace('/login');
        return;
      }
      try {
        const result = await fetchMe();
        if (cancelled) return;
        if (result.role !== 'store_owner') {
          // This dashboard is store-owner-only — a customer/rider/admin
          // account that somehow has a token here has no business seeing
          // partner data.
          clearTokens();
          router.replace('/login');
          return;
        }
        if (result.partner_suspended) {
          // Gloceries suspended this partner account — every partner API
          // route answers 403 PARTNER_SUSPENDED, so show why instead.
          router.replace('/suspended');
          return;
        }
        if (!result.has_store || !result.is_approved) {
          router.replace('/pending-approval');
          return;
        }
        setMe(result);
      } catch {
        if (!cancelled) {
          clearTokens();
          router.replace('/login');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { me, isLoading };
}
