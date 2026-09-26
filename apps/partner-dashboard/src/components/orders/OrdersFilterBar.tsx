'use client';

import { ChevronDown, Download } from 'lucide-react';
import type { OrderStatus } from '@/lib/partnerApi';
import { statusLabel } from '@/lib/format';

export const ORDER_FILTERS: Array<OrderStatus | 'all'> = ['all', 'placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

// Date-range presets, applied to `placed_at`. All real, computed client-side
// from timestamps the orders already carry — no new API surface.
export type DateRange = 'all' | 'today' | '7d' | '30d';
const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

interface Props {
  filter: OrderStatus | 'all';
  onFilterChange: (filter: OrderStatus | 'all') => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
}

// One labelled native <select> styled as a rounded pill. Native is the
// accessible, zero-dependency choice here — the reference's Location/Rider
// dropdowns are dropped on purpose: partner orders carry neither field.
function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] text-neutral-400">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-full border border-neutral-200 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-neutral-800 outline-none focus:border-neutral-300"
        >
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      </div>
    </label>
  );
}

export function OrdersFilterBar({ filter, onFilterChange, dateRange, onDateRangeChange, onExport }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid flex-1 grid-cols-2 gap-4 sm:max-w-md sm:grid-cols-2">
        <SelectField label="Status" value={filter} onChange={(v) => onFilterChange(v as OrderStatus | 'all')}>
          {ORDER_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === 'all' ? 'All status' : statusLabel(f)}
            </option>
          ))}
        </SelectField>

        <SelectField label="Date range" value={dateRange} onChange={(v) => onDateRangeChange(v as DateRange)}>
          {DATE_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </SelectField>
      </div>

      <button
        type="button"
        onClick={onExport}
        className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
      >
        <Download size={16} />
        Export
      </button>
    </div>
  );
}
