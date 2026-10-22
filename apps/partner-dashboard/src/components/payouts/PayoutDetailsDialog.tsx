'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Download, X } from 'lucide-react';
import type { Payout } from '@/lib/partnerApi';
import { formatDate } from '@/lib/format';
import { PayoutStatus, payoutStatusDescription } from './PayoutStatus';
import { downloadPayoutStatement, payoutMoney, payoutCommission } from './payoutStatement';

export function PayoutDetailsDialog({ payout, onClose }: { payout: Payout | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (payout && !dialog.current?.open) dialog.current?.showModal();
    if (!payout && dialog.current?.open) dialog.current.close();
  }, [payout]);
  return <dialog ref={dialog} onClose={onClose} aria-labelledby="payout-detail-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100vw-32px)] max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 text-gray-950 backdrop:bg-black/35">
    {payout && <>
      <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><h2 id="payout-detail-title" className="text-lg font-semibold">Settlement details</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close settlement details" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"><X size={20} /></button></header>
      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{formatDate(payout.week_start)} – {formatDate(payout.week_end)}</p><PayoutStatus status={payout.status} /></div>
        <p className="text-sm leading-6 text-gray-600">{payoutStatusDescription(payout.status)}</p>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Gross amount</dt><dd className="tnum font-medium">{payoutMoney(payout.gross_amount)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-gray-500">Commission deducted</dt><dd className="tnum">{payoutCommission(payout)}</dd></div>
          <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-semibold"><dt>Net payout</dt><dd className="tnum">{payoutMoney(payout.net_payout)}</dd></div>
          <div className="flex justify-between gap-4 pt-2"><dt className="text-gray-500">Paid on</dt><dd>{payout.paid_at ? formatDate(payout.paid_at) : payout.status === 'paid' ? 'Date not recorded' : 'Not paid yet'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="shrink-0 text-gray-500">Payout ID</dt><dd className="break-all text-right text-xs leading-5">{payout.id}</dd></div>
        </dl>
        {payout.payment_note && <div className="rounded-xl bg-gray-50 p-3"><h3 className="mb-1 text-xs font-semibold text-gray-500">Settlement note</h3><p className="text-sm leading-6 break-words">{payout.payment_note}</p></div>}
        {(payout.status === 'failed' || payout.status === 'blocked') && <Link href="/help" className="inline-flex rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium">Contact support</Link>}
      </div>
      <footer className="border-t border-gray-200 px-5 py-4"><button type="button" onClick={() => downloadPayoutStatement(payout)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"><Download size={16} />Download statement (CSV)</button></footer>
    </>}
  </dialog>;
}
