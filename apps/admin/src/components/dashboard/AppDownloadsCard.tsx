// Customer-app installs — split Android/iOS (AppDownloadStats' own note in
// lib/types.ts on why not combined), each with its own icon so the two
// numbers read as distinct platforms at a glance. "Live" here means "last
// synced" — no App Store Connect / Play Console API is wired yet.
//
// Compact by design — same size class as the Order completion card next to
// it, not a full detail panel. Used to carry a per-platform crash-status
// block, but that was fabricated data (no crash-reporting integration
// exists) rather than a real simplification target — dropped instead of
// kept as a fake "issue found" row.

import { Apple, PlayCircle, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/format';
import type { AppDownloadStats } from '@/lib/types';

const PLATFORM_ROWS = {
  android: { icon: PlayCircle, label: 'Android' },
  ios: { icon: Apple, label: 'iOS' },
} as const;

export function AppDownloadsCard({ stats }: { stats: AppDownloadStats }) {
  const total = stats.android + stats.ios;
  // Whichever platform is actually ahead leads the stack — a founder
  // scanning this card should see the bigger number first, not a fixed
  // Android-always-on-top order that goes stale the moment iOS overtakes it.
  const order: (keyof typeof PLATFORM_ROWS)[] = stats.android >= stats.ios ? ['android', 'ios'] : ['ios', 'android'];

  return (
    <Card title="App downloads" subtitle={`Last synced ${stats.lastSyncedAt}`} showMenu>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-ink">{formatNumber(total)}</span>
        <span className="flex items-center gap-0.5 text-xs font-semibold text-success">
          <TrendingUp size={11} />+{stats.changePctThisWeek}%
        </span>
        <span className="text-xs text-muted">this week</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {order.map((platform) => {
          const { icon: Icon, label } = PLATFORM_ROWS[platform];
          return (
            <div key={platform} className="flex items-center gap-3 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
                <Icon size={16} className="text-ink-soft" />
              </div>
              <div>
                <p className="text-lg font-semibold tabular-nums text-ink">{formatNumber(stats[platform])}</p>
                <p className="text-[11px] text-muted">{label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
