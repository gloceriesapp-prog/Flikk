'use client';

// Founder account + notification preferences. No real auth backing this
// yet (admin has no login flow built) — this is the settings surface for
// once one exists, same "believable shape from day one" convention as
// every other screen's mock data.

import { useState } from 'react';
import clsx from 'clsx';

const NOTIFICATION_PREFS = [
  { key: 'unassignedOrder', label: 'Order unassigned too long', description: 'Alert when a packed order has no rider after 20 minutes.' },
  { key: 'newApplication', label: 'New store or rider application', description: 'Alert the moment someone applies to join.' },
  { key: 'payoutReady', label: 'Weekly payout ready', description: 'Alert when a new settlement cycle is ready to review.' },
] as const;

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    unassignedOrder: true,
    newApplication: true,
    payoutReady: false,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-muted">Your account and notification preferences.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-ink">Founder account</h3>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-accent" />
          <div>
            <p className="text-base font-semibold text-ink">Founder</p>
            <p className="text-sm text-muted">founder@flikk.app</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-ink">Notifications</h3>
        <div className="flex flex-col gap-4">
          {NOTIFICATION_PREFS.map((pref) => (
            <div key={pref.key} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-ink">{pref.label}</p>
                <p className="text-xs text-muted">{pref.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, [pref.key]: !p[pref.key] }))}
                className={clsx(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  prefs[pref.key] ? 'bg-ink' : 'bg-accent'
                )}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    prefs[pref.key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
