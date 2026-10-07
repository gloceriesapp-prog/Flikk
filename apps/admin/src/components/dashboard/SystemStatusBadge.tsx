'use client';

// Overview's header used to end in a static Export CSV / Add store button
// pair — both actions already live inline where they're actually used
// (Revenue's own export, Stores' own add flow). "Is the product actually
// live right now" is the more useful glance-and-go signal for a founder
// to see the moment they open this screen.
//
// Real health, not a fabricated always-green dot:
//  - db: app/api/health's own Supabase reachability check
//  - realtime: this browser's live EventSource connection (useAdminRealtime)
// Both fine -> green "All systems live". db down -> red "Systems down", the
// one failure mode that actually breaks the dashboard. No live sync ->
// amber "Some systems degraded", since the rest still works.
//
// Re-checks every 60s (setInterval) and re-renders the "Updated Xm ago"
// line every 30s so it counts up between checks instead of freezing at
// "just now".

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { formatRelativeTime } from '@/lib/format';
import { useAdminRealtime } from '@/lib/realtime/useAdminRealtime';

type Health = 'operational' | 'degraded' | 'down';

const HEALTH_STYLES: Record<Health, { dot: string; text: string }> = {
  operational: { dot: 'bg-success', text: 'text-success' },
  degraded: { dot: 'bg-amber-500', text: 'text-amber-600' },
  down: { dot: 'bg-danger', text: 'text-danger' },
};

const CHECK_INTERVAL_MS = 60_000;
const CLOCK_TICK_MS = 30_000;

export function SystemStatusBadge() {
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { connected: realtimeOk } = useAdminRealtime(() => {});

  useEffect(() => {
    async function check() {
      const res = await fetch('/api/health');
      if (!res.ok) {
        setDbOk(false);
        setCheckedAt(new Date().toISOString());
        return;
      }
      const data = await res.json();
      setDbOk(data.dbOk);
      setCheckedAt(data.checkedAt);
    }
    Promise.resolve().then(check);
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(tick);
  }, []);

  if (dbOk === null) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5">
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-muted" />
        <p className="text-sm font-medium text-muted">Checking systems…</p>
      </div>
    );
  }

  const degradedReasons = [!realtimeOk && 'live sync'].filter(Boolean) as string[];

  const health: Health = !dbOk ? 'down' : degradedReasons.length > 0 ? 'degraded' : 'operational';
  const message =
    health === 'down' ? 'Systems down' : health === 'degraded' ? `Some systems degraded (${degradedReasons.join(', ')})` : 'All systems live';
  const style = HEALTH_STYLES[health];

  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5">
      <span className="relative flex h-2.5 w-2.5">
        {health === 'operational' && (
          <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', style.dot)} />
        )}
        <span className={clsx('relative inline-flex h-2.5 w-2.5 rounded-full', style.dot)} />
      </span>
      <div className="leading-tight">
        <p className={clsx('text-sm font-medium', style.text)}>{message}</p>
        <p className="text-xs text-muted">{checkedAt ? `Updated ${formatRelativeTime(checkedAt, now)}` : 'Updated just now'}</p>
      </div>
    </div>
  );
}
