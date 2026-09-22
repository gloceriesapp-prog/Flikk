'use client';

// Founder account + notification preferences (still mock — admin has no
// login flow built yet, same "believable shape from day one" convention
// as every other screen's mock data) + Delivery (real, backed by
// public.delivery_settings via app/api/delivery-settings/route.ts —
// apps/customer's own BillDetailsCard/CheckoutScreen read this exact same
// row, so a change here takes effect for every customer immediately, no
// app release needed) + Platform fees (real, backed by public.
// platform_settings via app/api/platform-settings/route.ts — the very
// next checkout after a save uses the new rate, see backend's own
// lib/platformSettings.ts note on why it's read fresh every time rather
// than cached).

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { fetchDeliverySettings, type DeliverySettings } from '@/lib/supabase/deliverySettings';

const NOTIFICATION_PREFS = [
  { key: 'unassignedOrder', label: 'Order unassigned too long', description: 'Alert when a packed order has no rider after 20 minutes.' },
  { key: 'newApplication', label: 'New store or rider application', description: 'Alert the moment someone applies to join.' },
  { key: 'payoutReady', label: 'Weekly payout ready', description: 'Alert when a new settlement cycle is ready to review.' },
] as const;

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={clsx('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-ink' : 'bg-accent')}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    unassignedOrder: true,
    newApplication: true,
    payoutReady: false,
  });

  // Delivery — the one real (non-mock) section on this page. `draft` is
  // what the two inputs/toggle edit; `saved` is what's actually live,
  // so "Save changes" only enables once draft genuinely differs from it.
  const [saved, setSaved] = useState<DeliverySettings | null>(null);
  const [draft, setDraft] = useState<{
    flatDeliveryFee: string;
    freeDeliveryEnabled: boolean;
    freeDeliveryThreshold: string;
    handlingFee: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Platform fees — same draft/saved/dirty shape as Delivery above, one
  // field. Stored in the DB as a 0-1 fraction (0.06); edited here as a
  // whole percent (6) since that's what a founder actually thinks in.
  const [savedCommissionRate, setSavedCommissionRate] = useState<number | null>(null);
  const [commissionDraft, setCommissionDraft] = useState('');
  const [isSavingCommission, setIsSavingCommission] = useState(false);
  const [commissionSaveError, setCommissionSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliverySettings().then((settings) => {
      setSaved(settings);
      setDraft({
        flatDeliveryFee: String(settings.flatDeliveryFee),
        freeDeliveryEnabled: settings.freeDeliveryEnabled,
        freeDeliveryThreshold: String(settings.freeDeliveryThreshold),
        handlingFee: String(settings.handlingFee),
      });
    });

    fetch('/api/platform-settings')
      .then((res) => res.json())
      .then((data: { commissionRate: number }) => {
        setSavedCommissionRate(data.commissionRate);
        setCommissionDraft(String(Math.round(data.commissionRate * 1000) / 10));
      });
  }, []);

  const isCommissionDirty =
    savedCommissionRate !== null && commissionDraft !== '' && Number(commissionDraft) / 100 !== savedCommissionRate;

  async function handleSaveCommission() {
    if (isSavingCommission) return;
    const percent = Number(commissionDraft);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setCommissionSaveError('Enter a percent between 0 and 100.');
      return;
    }
    setIsSavingCommission(true);
    setCommissionSaveError(null);
    try {
      const res = await fetch('/api/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: percent / 100 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save the commission rate.');
      setSavedCommissionRate((body as { commissionRate: number }).commissionRate);
    } catch (err) {
      setCommissionSaveError(err instanceof Error ? err.message : 'Could not save the commission rate.');
    } finally {
      setIsSavingCommission(false);
    }
  }

  const isDirty =
    draft !== null &&
    saved !== null &&
    (Number(draft.flatDeliveryFee) !== saved.flatDeliveryFee ||
      draft.freeDeliveryEnabled !== saved.freeDeliveryEnabled ||
      Number(draft.freeDeliveryThreshold) !== saved.freeDeliveryThreshold ||
      Number(draft.handlingFee) !== saved.handlingFee);

  async function handleSaveDelivery() {
    if (!draft || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/delivery-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatDeliveryFee: Number(draft.flatDeliveryFee),
          freeDeliveryEnabled: draft.freeDeliveryEnabled,
          freeDeliveryThreshold: Number(draft.freeDeliveryThreshold),
          handlingFee: Number(draft.handlingFee),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save delivery settings.');
      setSaved(body as DeliverySettings);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save delivery settings.');
    } finally {
      setIsSaving(false);
    }
  }

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
              <ToggleSwitch checked={prefs[pref.key]} onChange={() => setPrefs((p) => ({ ...p, [pref.key]: !p[pref.key] }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-ink">Delivery &amp; fees</h3>
        <p className="mb-4 text-xs text-muted">
          Applies to every customer order right now. Free delivery is off deliberately — flat fees only, until it&apos;s
          switched on here.
        </p>

        {!draft ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Flat delivery fee</p>
                <p className="text-xs text-muted">Charged on every order unless free delivery below is on and the order qualifies.</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <span className="text-sm text-muted">₹</span>
                <input
                  type="number"
                  min={0}
                  value={draft.flatDeliveryFee}
                  onChange={(e) => setDraft({ ...draft, flatDeliveryFee: e.target.value })}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <p className="text-sm font-medium text-ink">Handling fee</p>
                <p className="text-xs text-muted">Charged on every order, regardless of free delivery.</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <span className="text-sm text-muted">₹</span>
                <input
                  type="number"
                  min={0}
                  value={draft.handlingFee}
                  onChange={(e) => setDraft({ ...draft, handlingFee: e.target.value })}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <p className="text-sm font-medium text-ink">Free delivery</p>
                <p className="text-xs text-muted">Waive the fee once an order&apos;s item total crosses the threshold below.</p>
              </div>
              <ToggleSwitch
                checked={draft.freeDeliveryEnabled}
                onChange={() => setDraft({ ...draft, freeDeliveryEnabled: !draft.freeDeliveryEnabled })}
              />
            </div>

            {draft.freeDeliveryEnabled && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-ink">Free-delivery threshold</p>
                <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                  <span className="text-sm text-muted">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.freeDeliveryThreshold}
                    onChange={(e) => setDraft({ ...draft, freeDeliveryThreshold: e.target.value })}
                    className="w-16 bg-transparent text-sm font-semibold text-ink outline-none"
                  />
                </div>
              </div>
            )}

            {saveError && <p className="text-xs font-medium text-red-600">{saveError}</p>}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              {isDirty && !isSaving && <span className="text-xs text-muted">Unsaved changes</span>}
              <button
                type="button"
                disabled={!isDirty || isSaving}
                onClick={handleSaveDelivery}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-ink">Platform fees</h3>
        <p className="mb-4 text-xs text-muted">
          The cut Flikk takes from every store&apos;s order — was hardcoded, now applies to the very next checkout.
        </p>

        {savedCommissionRate === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Commission rate</p>
                <p className="text-xs text-muted">Deducted from every store&apos;s payout at delivery.</p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={commissionDraft}
                  onChange={(e) => setCommissionDraft(e.target.value)}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none"
                />
                <span className="text-sm text-muted">%</span>
              </div>
            </div>

            {commissionSaveError && <p className="text-xs font-medium text-red-600">{commissionSaveError}</p>}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              {isCommissionDirty && !isSavingCommission && <span className="text-xs text-muted">Unsaved changes</span>}
              <button
                type="button"
                disabled={!isCommissionDirty || isSavingCommission}
                onClick={handleSaveCommission}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {isSavingCommission ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
