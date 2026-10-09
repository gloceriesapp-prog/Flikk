'use client';

// Gloceries suspended this partner account (users.partner_suspended,
// migration 114). Every partner API route refuses with 403
// PARTNER_SUSPENDED meanwhile; this page shows the admin's reason from
// GET /auth/me and sends the owner back to the dashboard once reinstated.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe } from '@/lib/authApi';
import { clearTokens } from '@/lib/authStorage';

export default function SuspendedPage() {
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        if (!me.partner_suspended) router.replace('/');
        else setReason(me.partner_suspended_reason ?? null);
      } catch {
        // Retried on the next interval.
      }
    }
    void check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-red-200 bg-white p-8 text-center">
        <p className="text-[26px] font-bold tracking-tight text-neutral-900">Account suspended</p>
        <p className="mt-2 text-sm text-neutral-700">{reason ?? 'Your partner account has been suspended by Gloceries.'}</p>
        <p className="mt-2 text-sm text-neutral-500">
          Your store is closed until Gloceries reinstates your account. Contact Gloceries support.
        </p>
        <button
          type="button"
          onClick={() => {
            clearTokens();
            router.replace('/login');
          }}
          className="mt-6 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
