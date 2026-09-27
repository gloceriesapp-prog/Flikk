// Real GET/PATCH /rider/availability — the rider's weekly working-hours
// schedule plus the auto-online master switch. Same lazy-client pattern as
// api/orders.ts (client + its auth-store → RN chain imported per-call so this
// module's shape stays plain-node testable); Metro caches the import, no
// per-call cost. defaultWeek() below is the client-side scaffold the screen
// renders when the backend has never been configured (availability: []) —
// seven ascending days, all disabled, with a sensible 09:00–18:00 default so
// every row already has something to toggle into.

// day 0=Sunday..6=Saturday (JS Date.getDay()); exactly 7 entries ascending;
// start/end 'HH:MM' 24h IST; end>start; meaningful only when enabled. Matches
// backend/src/lib/riderSchedule.ts's own DaySchedule contract by hand — no
// packages/shared to share it through yet (CLAUDE.md's own no-monorepo rule).
export type DaySchedule = { day: number; enabled: boolean; start: string; end: string };

export async function fetchAvailability(): Promise<{ availability: DaySchedule[]; autoOnline: boolean }> {
  const { apiRequest } = await import('./client');
  return apiRequest('/rider/availability');
}

export async function saveAvailability(availability: DaySchedule[], autoOnline: boolean): Promise<void> {
  const { apiRequest } = await import('./client');
  return apiRequest('/rider/availability', { method: 'PATCH', body: { availability, autoOnline } });
}

// Seven-day scaffold (days 0..6 ascending, all disabled) so the screen has
// real rows to render before the rider has ever configured anything — the
// backend returns availability: [] in that case, and seeding here beats
// making the screen render an empty state for a form that's meant to be
// filled in.
export function defaultWeek(): DaySchedule[] {
  return Array.from({ length: 7 }, (_, day) => ({ day, enabled: false, start: '09:00', end: '18:00' }));
}
