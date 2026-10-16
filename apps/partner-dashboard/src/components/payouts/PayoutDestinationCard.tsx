import Link from 'next/link';
import { BadgeCheck, ChevronRight, Landmark, Smartphone, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import type { Store } from '@/lib/partnerApi';

interface Props {
  store: Store;
  // The Payouts page links this card to Settings to change it. Settings
  // itself embeds this same card directly above its own verify form
  // (PayoutVerificationForm) — a "go to Settings" link there would point
  // at the page it's already on, so that caller passes false.
  linkToSettings?: boolean;
  className?: string;
}

// Read-only summary of where this store's money goes (payout_* fields on
// Store, written via PUT /partner/payout-account). Never demo-faked: an
// unset store gets an honest "not set up yet" state instead.
//
// On the Payouts page (linkToSettings) it's a standalone white card on the
// canvas; embedded in Settings' own white section it's a soft slate panel
// so it doesn't vanish into the card around it.
export function PayoutDestinationCard({ store, linkToSettings = true, className }: Props) {
  const surface = linkToSettings
    ? 'rounded-[20px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
    : 'rounded-2xl border border-slate-200 bg-slate-50/60';

  if (!store.payout_method) {
    return (
      <div
        className={clsx(
          'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between',
          linkToSettings ? 'rounded-[20px] bg-amber-50' : 'rounded-2xl border border-amber-200 bg-amber-50',
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <TriangleAlert size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">No payout method set</p>
            <p className="text-sm text-slate-600">
              {linkToSettings ? 'Add a UPI ID or bank account in Settings to receive payouts.' : 'Add a UPI ID below to receive payouts.'}
            </p>
          </div>
        </div>
        {linkToSettings && (
          <Link
            href="/settings"
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            Set up payouts <ChevronRight size={15} />
          </Link>
        )}
      </div>
    );
  }

  const isUpi = store.payout_method === 'upi';
  const verified = !!store.payout_upi_verified_name;

  return (
    <div className={clsx('flex items-center justify-between gap-3 p-5', surface, className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          {isUpi ? <Smartphone size={19} /> : <Landmark size={19} />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">Payouts go to</p>
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold text-ink">
              {isUpi ? store.payout_upi_id : `${store.payout_bank_name} · ${store.payout_bank_account_number}`}
            </p>
            {verified && <BadgeCheck size={16} className="shrink-0 text-emerald-600" />}
          </div>
          <p className="truncate text-sm text-slate-500">
            {verified ? `Verified · ${store.payout_upi_verified_name}` : isUpi ? 'UPI' : `IFSC ${store.payout_bank_ifsc}`}
          </p>
        </div>
      </div>
      {linkToSettings && (
        <Link
          href="/settings"
          className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Change
        </Link>
      )}
    </div>
  );
}
