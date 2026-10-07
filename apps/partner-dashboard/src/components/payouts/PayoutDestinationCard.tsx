import Link from 'next/link';
import { BadgeCheck, Landmark, Smartphone, TriangleAlert } from 'lucide-react';
import type { Store } from '@/lib/partnerApi';

interface Props {
  store: Store;
  // The Payouts page links this card to Settings to change it. Settings
  // itself embeds this same card directly above its own verify form
  // (PayoutVerificationForm) — a "go to Settings" link there would point
  // at the page it's already on, so that caller passes false.
  linkToSettings?: boolean;
}

// Read-only summary of where this store's money goes (payout_* fields on
// Store, written via PUT /partner/payout-account). Never demo-faked: an
// unset store gets an honest "not set up yet" state instead.
export function PayoutDestinationCard({ store, linkToSettings = true }: Props) {
  if (!store.payout_method) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <TriangleAlert size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">No payout method set</p>
            <p className="text-sm text-neutral-500">
              {linkToSettings ? 'Add a UPI ID or bank account in Settings to receive payouts.' : 'Add a UPI ID below to receive payouts.'}
            </p>
          </div>
        </div>
        {linkToSettings && (
          <Link href="/settings" className="shrink-0 text-sm font-medium text-amber-700 hover:underline">
            Set up in Settings
          </Link>
        )}
      </div>
    );
  }

  const isUpi = store.payout_method === 'upi';

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          {isUpi ? <Smartphone size={18} /> : <Landmark size={18} />}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-neutral-900">{isUpi ? store.payout_upi_id : `${store.payout_bank_name} · ${store.payout_bank_account_number}`}</p>
            {store.payout_upi_verified_name && <BadgeCheck size={15} className="shrink-0 text-emerald-600" />}
          </div>
          <p className="text-sm text-neutral-400">
            {store.payout_upi_verified_name ? `Verified · ${store.payout_upi_verified_name}` : isUpi ? 'UPI' : `IFSC ${store.payout_bank_ifsc}`}
          </p>
        </div>
      </div>
      {linkToSettings && (
        <Link href="/settings" className="shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-900">
          Change
        </Link>
      )}
    </div>
  );
}
