'use client';

// Same real gate the partner mobile app already enforces — a phone
// number can verify OTP successfully but have no approved store yet
// (either still mid-onboarding, or awaiting a founder's approval in
// admin). This dashboard has nothing to show that account until
// GET /auth/me reports has_store && is_approved.

import { clearTokens } from '@/lib/authStorage';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[26px] font-bold tracking-tight text-neutral-900">Almost there</p>
        <p className="mt-2 text-sm text-neutral-500">
          Your store application is still being reviewed, or hasn&apos;t been submitted yet. Finish onboarding and check
          approval status from the Flikk Partner mobile app — this dashboard unlocks once your store is approved.
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
