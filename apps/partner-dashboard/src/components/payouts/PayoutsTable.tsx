'use client';

import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import type { Payout } from '@/lib/partnerApi';
import { formatDate } from '@/lib/format';
import { PayoutStatus } from './PayoutStatus';
import { PayoutDetailsDialog } from './PayoutDetailsDialog';
import { downloadPayoutStatement, payoutMoney, payoutCommission } from './payoutStatement';

// "5 – 11 Oct 2026" when the week sits inside one month, else the full pair.
export function formatWeek(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${formatDate(endIso)}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${formatDate(endIso)}`;
  }
  return `${formatDate(startIso)} – ${formatDate(endIso)}`;
}


function PayoutActions({ payout, onView }: { payout: Payout; onView: (payout: Payout) => void }) {
  return <div className="flex items-center justify-end gap-1.5">
    <button type="button" onClick={() => onView(payout)} aria-label={`View settlement for ${formatWeek(payout.week_start, payout.week_end)}`} className="inline-flex h-9 md:h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-950 hover:bg-gray-50"><Eye size={15} aria-hidden />View</button>
    <button type="button" onClick={() => downloadPayoutStatement(payout)} aria-label={`Download CSV statement for ${formatWeek(payout.week_start, payout.week_end)}`} title="Download statement (CSV)" className="flex h-9 w-9 md:h-8 md:w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"><Download size={16} aria-hidden /></button>
  </div>;
}

function PaidOn({ payout }: { payout: Payout }) {
  return <div className="min-w-0 space-y-1"><span className="text-sm text-gray-600">{payout.paid_at ? formatDate(payout.paid_at) : '—'}</span>{payout.payment_note && <p title={payout.payment_note} className="line-clamp-1 text-xs leading-5 break-words text-gray-500">{payout.payment_note}</p>}</div>;
}

export function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = payouts.find(payout => payout.id === selectedId) ?? null;
  return <>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[1100px] border-collapse text-left">
        <caption className="sr-only">Weekly settlements with recorded amounts, status and statement actions</caption>
        <thead className="bg-gray-50 text-sm font-semibold text-gray-950">
          <tr className="divide-x divide-gray-200 border-y border-gray-200">
            {['Sl no.', 'Settlement period', 'Gross amount', 'Commission', 'Net payout', 'Status', 'Paid on / note', 'Actions'].map((title, index) => <th key={title} scope="col" className={`px-4 py-3 whitespace-nowrap ${index >= 2 && index <= 4 ? 'text-right' : index === 0 ? 'w-16 text-center' : index === 7 ? 'w-36 text-right' : ''}`}>{title}</th>)}
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout, index) => <tr key={payout.id} className="divide-x divide-gray-200 border-b border-gray-200 last:border-b-0 hover:bg-gray-50/60">
            <td className="tnum px-4 py-2.5 text-center text-sm text-gray-500">{index + 1}</td>
            <th scope="row" className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-gray-950">{formatWeek(payout.week_start, payout.week_end)}</th>
            <td className="tnum px-4 py-2.5 text-right text-sm whitespace-nowrap text-gray-600">{payoutMoney(payout.gross_amount)}</td>
            <td className="tnum px-4 py-2.5 text-right text-sm whitespace-nowrap text-gray-500" title="Effective commission calculated from this settlement’s recorded gross amount and deduction">{payoutCommission(payout)}</td>
            <td className="tnum px-4 py-2.5 text-right text-sm font-semibold whitespace-nowrap text-gray-950">{payoutMoney(payout.net_payout)}</td>
            <td className="px-4 py-2.5"><PayoutStatus status={payout.status} /></td>
            <td className="max-w-60 px-4 py-2.5"><PaidOn payout={payout} /></td>
            <td className="px-3 py-2.5"><PayoutActions payout={payout} onView={p => setSelectedId(p.id)} /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <ul className="divide-y divide-gray-200 border-t border-gray-200 md:hidden">
      {payouts.map((payout, index) => <li key={payout.id} className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{index + 1}. {formatWeek(payout.week_start, payout.week_end)}</p><PayoutStatus status={payout.status} /></div>
        <p className="tnum text-xl font-semibold">{payoutMoney(payout.net_payout)}</p>
        <p className="text-xs text-gray-500">Gross {payoutMoney(payout.gross_amount)} · Commission {payoutCommission(payout)}</p>
        <div className="flex items-end justify-between gap-3"><PaidOn payout={payout} /><PayoutActions payout={payout} onView={p => setSelectedId(p.id)} /></div>
      </li>)}
    </ul>
    <PayoutDetailsDialog payout={selected} onClose={() => setSelectedId(null)} />
  </>;
}
