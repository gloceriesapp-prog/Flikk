import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PayoutMetricCard({ label, value, icon: Icon, sublabel }: { label: string; value: ReactNode; icon: LucideIcon; sublabel?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-200/70 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-gray-950">{label}</p>
        <Icon size={18} strokeWidth={1.6} className="shrink-0 text-gray-400" aria-hidden />
      </div>
      <p className="tnum min-w-0 text-[28px] font-semibold leading-tight tracking-tight break-words text-gray-950 sm:text-[32px]">{value}</p>
      {sublabel && <p className="text-xs leading-5 text-gray-500">{sublabel}</p>}
    </div>
  );
}
