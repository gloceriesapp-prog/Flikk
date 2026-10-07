'use client';

// Rider picker shared by manual assignment (AssignRiderRow) and the order
// detail reassign action. Riders who can take a job right now (online with a
// fresh position ping — ActiveRider.liveNow) are listed first; everyone else
// with an active account follows under "Not live", with when they were last
// seen, so the founder can still pick them deliberately.

import type { ActiveRider } from '@/lib/types';
import { formatRelativeTime } from '@/lib/format';

interface Props {
  riders: ActiveRider[];
  value: string;
  onChange: (riderId: string) => void;
  disabled?: boolean;
  excludeUserIds?: string[];
}

function lastSeen(rider: ActiveRider): string {
  return rider.lastSeenAt ? `seen ${formatRelativeTime(rider.lastSeenAt)}` : 'never seen';
}

export function sortRidersForAssignment(riders: ActiveRider[]): { live: ActiveRider[]; notLive: ActiveRider[] } {
  const assignable = riders.filter((r) => r.isOnline);
  const byLoad = (a: ActiveRider, b: ActiveRider) => a.activeOrders - b.activeOrders || a.name.localeCompare(b.name);
  const bySeen = (a: ActiveRider, b: ActiveRider) =>
    (b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0) - (a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0);
  return {
    live: assignable.filter((r) => r.liveNow).sort(byLoad),
    notLive: assignable.filter((r) => !r.liveNow).sort(bySeen),
  };
}

export function RiderSelect({ riders, value, onChange, disabled, excludeUserIds = [] }: Props) {
  const visible = riders.filter((r) => !excludeUserIds.includes(r.userId));
  const { live, notLive } = sortRidersForAssignment(visible);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Rider"
      className="max-w-[260px] rounded-full border border-border bg-canvas px-3.5 py-2 text-sm text-ink-soft focus:outline-none"
    >
      <option value="">Select rider</option>
      <optgroup label={`Live now (${live.length})`}>
        {live.map((rider) => (
          <option key={rider.id} value={rider.id}>
            {rider.name} · {rider.presence === 'on_delivery' ? 'on delivery' : 'online'} · {rider.activeOrders} active
          </option>
        ))}
      </optgroup>
      {notLive.length > 0 && (
        <optgroup label="Not live">
          {notLive.map((rider) => (
            <option key={rider.id} value={rider.id}>
              {rider.name} · {rider.presence === 'offline' ? 'offline' : 'no fresh ping'} · {lastSeen(rider)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
