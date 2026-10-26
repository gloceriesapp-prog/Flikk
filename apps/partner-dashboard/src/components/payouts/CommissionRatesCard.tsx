// What Gloceries charges on this store's new orders (GET /partner/commission).
// With category rates: one line per rate listing its categories, the rate for
// any other category, and the per-order cap. With the store's own rate (or an
// older backend): that one rate on the item total.

import { Percent } from 'lucide-react';
import { groupCommissionRates, type PartnerCommission } from '@/lib/partnerApi';

const percent = (rate: number) => `${Math.round(rate * 10000) / 100}%`;

export function CommissionRatesCard({ commission, className = '' }: { commission: PartnerCommission; className?: string }) {
  const groups = commission.isStoreOverride ? [] : groupCommissionRates(commission.categoryRates ?? []);
  const cap = commission.capPerOrder;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-gray-200/70 bg-white p-4 ${className}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        <Percent size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">Gloceries commission{commission.isStoreOverride ? ' · your store’s rate' : ''}</p>
        {groups.length === 0 ? (
          <p className="text-[15px] font-semibold text-ink">
            <span className="tnum">{percent(commission.commissionRate)}</span>
            <span className="font-normal text-slate-500"> of the item total on each new order</span>
          </p>
        ) : (
          <dl className="mt-1 flex flex-col gap-1 text-sm">
            {[...groups, { rate: commission.commissionRate, categories: ['Any other category'] }].map((group, index) => (
              <div key={`${group.rate}-${index}`} className="flex gap-3">
                <dt className="tnum w-11 shrink-0 font-semibold text-ink">{percent(group.rate)}</dt>
                <dd className="text-slate-600">{group.categories.join(', ')}</dd>
              </div>
            ))}
          </dl>
        )}
        {cap != null && <p className="mt-1.5 text-xs text-slate-500">Never more than {`₹${cap.toLocaleString('en-IN')}`} commission on one order.</p>}
      </div>
    </div>
  );
}
