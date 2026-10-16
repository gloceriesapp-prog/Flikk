import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CalendarDays, ReceiptText, ShoppingBag, Wallet, type LucideIcon } from 'lucide-react';
import type { TodayStats } from '@/lib/partnerApi';
import { formatInr } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { CardLabel, Skeleton } from './parts';

// "Today at a glance": three soft-tinted tiles, like the reference's Business
// Data card. Orders and earnings are the server's own figures (GET /partner/
// stats/today, IST), so they match the phone app exactly.
export function TodayCard({
  stats,
  averageOrderValue,
}: {
  // Undefined while the first stats request is in flight.
  stats: TodayStats | undefined;
  averageOrderValue: number | null;
}) {
  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex h-9 items-center">
        <CardLabel icon={CalendarDays} className="text-lg text-ink">
          Today
        </CardLabel>
      </div>
      <div className="mt-4 grid flex-1 grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
        <Tile
          tint="blue"
          icon={ReceiptText}
          label="Orders today"
          value={stats ? String(stats.ordersToday) : null}
          note={stats ? `${stats.pendingToday} still in progress` : null}
        />
        <Tile
          tint="amber"
          icon={Wallet}
          label="Earnings today"
          value={stats ? formatInr(stats.earningToday) : null}
          note="Delivered, after commission"
        />
        <Tile
          tint="green"
          icon={ShoppingBag}
          label="Average order value"
          value={stats ? (averageOrderValue === null ? '—' : formatInr(averageOrderValue)) : null}
          note={averageOrderValue === null ? 'No orders yet today' : 'Per customer bill'}
        />
      </div>
    </Card>
  );
}

const TINTS = {
  blue: { bg: 'bg-[#eef3ff]', icon: 'text-accent' },
  amber: { bg: 'bg-[#fff6e9]', icon: 'text-amber-600' },
  green: { bg: 'bg-[#ebf7f1]', icon: 'text-emerald-600' },
};

function Tile({
  tint,
  icon: Icon,
  label,
  value,
  note,
}: {
  tint: keyof typeof TINTS;
  icon: LucideIcon;
  label: string;
  value: string | null;
  note: ReactNode;
}) {
  const t = TINTS[tint];
  return (
    <div className={clsx('flex flex-col justify-center rounded-2xl px-4 py-3.5', t.bg)}>
      <p className="text-[13px] text-slate-600">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Icon size={18} strokeWidth={1.8} className={clsx('shrink-0', t.icon)} aria-hidden />
        {value === null ? (
          <Skeleton className="h-6 w-20 bg-white/70" />
        ) : (
          <p className="tnum truncate text-[22px] leading-tight font-semibold text-ink">{value}</p>
        )}
      </div>
      {note && <p className="mt-1 truncate text-xs text-slate-500">{note}</p>}
    </div>
  );
}
