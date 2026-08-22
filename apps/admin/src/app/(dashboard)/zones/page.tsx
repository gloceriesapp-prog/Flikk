// Zones — matches the zones table being first-class in the schema from
// day 1 (PRD Section 16). Only Kaup is active; the other cards show the
// framework is ready for Section 26's roadmap (Karkala/Kundapura) without
// any schema change — CLAUDE.md is explicit multi-zone itself is NOT in
// scope yet, so these render as disabled "coming later" cards, not
// activatable toggles.

import { Lock, MapPin } from 'lucide-react';
import { PLACEHOLDER_ZONES } from '@/lib/mock-data';

export default function ZonesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Zones</h1>
        <p className="text-sm text-muted">Flikk launches single-zone — this is where a second zone activates later.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_ZONES.map((zone) => (
          <div
            key={zone.id}
            className={
              zone.isActive
                ? 'rounded-3xl border border-border bg-card p-5 shadow-sm'
                : 'rounded-3xl border border-dashed border-border bg-card/50 p-5 opacity-70'
            }
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                <MapPin size={18} className="text-ink-soft" />
              </div>
              {zone.isActive ? (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-success">Active</span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-muted">
                  <Lock size={11} />
                  Not yet
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-ink">{zone.name}</h3>
            {zone.isActive ? (
              <p className="mt-1 text-sm text-muted">
                {zone.storeCount} stores · {zone.riderCount} riders
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">Planned per roadmap — activates with zero schema change.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
