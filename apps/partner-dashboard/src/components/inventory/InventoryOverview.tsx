'use client';
import { Boxes, PackageX, PackageSearch, Clock3, type LucideIcon } from 'lucide-react';
import type { InventoryOverviewData } from '@/lib/partnerApi';
import type { StockFilter } from './InventoryFilterBar';

export function InventoryOverview({ data, onSelect }: { data?: InventoryOverviewData; onSelect: (filter: StockFilter) => void }) {
  const cards: { label: string; value: string; badge: string; detail: string; filter: StockFilter; icon: LucideIcon }[] = [
    { label: 'Live on app', value: data ? `${data.live} / ${data.total}` : '—', badge: data ? `${data.total ? Math.round(data.live / data.total * 100) : 0}%` : 'Loading…', detail: data ? `${data.notLive} not live · ${data.pending} waiting approval` : 'Checking products', filter: 'all', icon: Boxes },
    { label: 'Out of stock', value: data ? String(data.outOfStock) : '—', badge: 'Restock', detail: data ? `${data.outOfStockNames.join(', ')}${data.outOfStock > data.outOfStockNames.length ? ` +${data.outOfStock - data.outOfStockNames.length}` : ''}` || 'All products available' : 'Checking stock', filter: 'out_of_stock', icon: PackageX },
    { label: 'Running low', value: data ? String(data.runningLow) : '—', badge: 'Under 5 left', detail: data?.lowStockExample ? `${data.lowStockExample.name}: ${data.lowStockExample.stock_quantity} left` : data ? 'No products running low' : 'Checking quantities', filter: 'low_stock', icon: PackageSearch },
    { label: 'Pending approval', value: data ? String(data.pending) : '—', badge: 'Under review', detail: data ? data.pendingNames.join(', ') || 'Nothing waiting for approval' : 'Checking approvals', filter: 'pending', icon: Clock3 },
  ];
  return <section aria-label="Inventory overview" className="grid grid-cols-1 gap-1.5 min-[480px]:grid-cols-2 xl:grid-cols-4">
    {cards.map(({ label, value, badge, detail, filter, icon: Icon }) => <button key={label} type="button" onClick={() => onSelect(filter)} className="flex min-w-0 flex-col rounded-2xl border border-slate-200/70 bg-white p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
      <div className="flex w-full items-center justify-between gap-2"><h2 className="text-[14px] font-semibold text-black">{label}</h2><Icon size={17} strokeWidth={1.6} className="shrink-0 text-slate-400" aria-hidden /></div>
      <div className="mt-3 flex items-baseline gap-3"><p className="tnum text-[30px] font-semibold leading-tight tracking-tight text-ink">{value}</p><span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-slate-600">{badge}</span></div>
      <p title={detail} className="mt-3 w-full truncate text-[13px] font-medium text-slate-500">{detail}</p>
    </button>)}
  </section>;
}
