// Customer-app installs — split Android/iOS (AppDownloadStats' own note in
// lib/types.ts on why not combined), each with its own icon so the two
// numbers read as distinct platforms at a glance, not one blob split by a
// slash. "Live" here means "last synced" — no App Store Connect / Play
// Console API is wired yet, so this is the same last-synced convention as
// SystemStatus, not a real-time socket.

import { AlertTriangle, Apple, CheckCircle2, PlayCircle, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/format';
import type { AppDownloadStats, AppPlatformStatus } from '@/lib/types';

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

      {/* Build health per platform — no crash-reporting integration
          (Sentry/Crashlytics) exists yet, same not-real-time caveat as
          the download counts above. An "issue" row carries the actual
          message, not a generic "problem detected" — that's the whole
          point of surfacing it here. */}
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
        {order.map((platform) => {
          const { label } = PLATFORM_ROWS[platform];
          const status = platform === 'android' ? stats.androidStatus : stats.iosStatus;
          return <PlatformStatusRow key={platform} label={label} status={status} />;
        })}
      </div>
    </Card>
  );
}

function PlatformStatusRow({ label, status }: { label: string; status: AppPlatformStatus }) {
  const isOk = status.health === 'operational';
  return (
    <div className={clsx('flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5', isOk ? 'bg-green-50' : 'bg-red-50')}>
      {isOk ? (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
      ) : (
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-danger" />
      )}
      <div className="min-w-0">
        <p className={clsx('text-xs font-semibold', isOk ? 'text-success' : 'text-danger')}>
          {label} {isOk ? 'working fine' : 'issue found'}
        </p>
        <p className="text-[11px] text-ink-soft">{status.message}</p>
      </div>
    </div>
  );
}
