'use client';

// Which zone a store belongs to (stores.zone_id) — decides which zone's
// customers can discover and order from it. Moves go through
// POST /api/stores/[id]/zone; zones themselves are created on the Zones page.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Zone } from '@/lib/types';

export function StoreZonePanel({ storeId, zoneId, zoneName }: { storeId: string; zoneId: string | null; zoneName: string }) {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState(zoneId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/zones', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Zone[]) => setZones(list))
      .catch(() => setZones([]));
  }, []);

  const choices = zones.filter((z) => z.isActive || z.id === zoneId);

  async function save() {
    if (!selected || selected === zoneId) return;
    const target = zones.find((z) => z.id === selected);
    if (!window.confirm(`Move this store to ${target?.name ?? 'that zone'}? Only customers in that zone will see it.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/zone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId: selected }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not move the store.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the store.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Zone</h2>
          <p className="mt-1 text-sm text-muted">Currently in {zoneName || 'no zone'}. Customers only see stores in their own zone.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Zone"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
          >
            {!selected && <option value="">Choose zone…</option>}
            {choices.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
                {z.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !selected || selected === zoneId}
            onClick={() => void save()}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Moving…' : 'Move store'}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
