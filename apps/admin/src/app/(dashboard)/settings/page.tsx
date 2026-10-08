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
import { fetchDeliverySettings, minuteToTimeInput, timeInputToMinute, type DeliverySettings } from '@/lib/supabase/deliverySettings';

type TierDraft = { upToKm: string; fee: string };

function tiersEqual(draft: TierDraft[], saved: DeliverySettings['deliveryFeeTiers']): boolean {
  return draft.length === saved.length && draft.every((tier, i) => Number(tier.upToKm) === saved[i]!.upToKm && Number(tier.fee) === saved[i]!.fee);
}

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
    estimatedDeliveryMinutes: string;
    riderBasePayout: string;
    riderExtraStopPayout: string;
    extraStopFee: string;
    defaultDeliveryRadiusKm: string;
    roadDistanceFactor: string;
    maxStoreSpreadKm: string;
    storeResponseTimeoutMinutes: string;
    checkoutHoldMinutes: string;
    checkoutReconciliationGraceMinutes: string;
    deliveryFeeTiers: TierDraft[];
    orderingOpens: string;
    orderingCloses: string;
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
        estimatedDeliveryMinutes: String(settings.estimatedDeliveryMinutes),
        riderBasePayout: String(settings.riderBasePayout),
        riderExtraStopPayout: String(settings.riderExtraStopPayout),
        extraStopFee: String(settings.extraStopFee),
        defaultDeliveryRadiusKm: String(settings.defaultDeliveryRadiusKm),
        roadDistanceFactor: String(settings.roadDistanceFactor),
        maxStoreSpreadKm: String(settings.maxStoreSpreadKm),
        checkoutHoldMinutes: String(settings.checkoutHoldMinutes),
        checkoutReconciliationGraceMinutes: String(settings.checkoutReconciliationGraceMinutes),
        storeResponseTimeoutMinutes: String(settings.storeResponseTimeoutMinutes),
        deliveryFeeTiers: settings.deliveryFeeTiers.map((tier) => ({ upToKm: String(tier.upToKm), fee: String(tier.fee) })),
        orderingOpens: minuteToTimeInput(settings.orderingOpensMinute),
        orderingCloses: minuteToTimeInput(settings.orderingClosesMinute),
      });
    }).catch(() => setSaveError('Could not load delivery settings. Refresh to try again.'));

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
      Number(draft.handlingFee) !== saved.handlingFee ||
      Number(draft.estimatedDeliveryMinutes) !== saved.estimatedDeliveryMinutes ||
      Number(draft.riderBasePayout) !== saved.riderBasePayout ||
      Number(draft.riderExtraStopPayout) !== saved.riderExtraStopPayout ||
      Number(draft.extraStopFee) !== saved.extraStopFee ||
      Number(draft.defaultDeliveryRadiusKm) !== saved.defaultDeliveryRadiusKm ||
      Number(draft.roadDistanceFactor) !== saved.roadDistanceFactor ||
      Number(draft.maxStoreSpreadKm) !== saved.maxStoreSpreadKm ||
      Number(draft.checkoutHoldMinutes) !== saved.checkoutHoldMinutes ||
      Number(draft.checkoutReconciliationGraceMinutes) !== saved.checkoutReconciliationGraceMinutes ||
      Number(draft.storeResponseTimeoutMinutes) !== saved.storeResponseTimeoutMinutes ||
      !tiersEqual(draft.deliveryFeeTiers, saved.deliveryFeeTiers) ||
      timeInputToMinute(draft.orderingOpens) !== saved.orderingOpensMinute ||
      timeInputToMinute(draft.orderingCloses, true) !== saved.orderingClosesMinute);

  async function handleSaveDelivery() {
    if (!draft || isSaving) return;
    const minutes = Number(draft.estimatedDeliveryMinutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      setSaveError('Enter a delivery estimate between 1 and 240 whole minutes.');
      return;
    }
    const orderingOpensMinute = timeInputToMinute(draft.orderingOpens);
    const orderingClosesMinute = timeInputToMinute(draft.orderingCloses, true);
    if (orderingOpensMinute === null || orderingClosesMinute === null) {
      setSaveError('Enter both ordering hours.');
      return;
    }
    if (orderingOpensMinute >= orderingClosesMinute) {
      setSaveError('Ordering must open before it closes. The window cannot cross midnight.');
      return;
    }
    const responseMinutes = Number(draft.storeResponseTimeoutMinutes);
    if (!Number.isInteger(responseMinutes) || responseMinutes < 3 || responseMinutes > 120) {
      setSaveError('Enter a store response time between 3 and 120 whole minutes.');
      return;
    }
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
          estimatedDeliveryMinutes: Number(draft.estimatedDeliveryMinutes),
          riderBasePayout: Number(draft.riderBasePayout),
          riderExtraStopPayout: Number(draft.riderExtraStopPayout),
          extraStopFee: Number(draft.extraStopFee),
          defaultDeliveryRadiusKm: Number(draft.defaultDeliveryRadiusKm),
          roadDistanceFactor: Number(draft.roadDistanceFactor),
          maxStoreSpreadKm: Number(draft.maxStoreSpreadKm),
          checkoutHoldMinutes: Number(draft.checkoutHoldMinutes),
          checkoutReconciliationGraceMinutes: Number(draft.checkoutReconciliationGraceMinutes),
          storeResponseTimeoutMinutes: Number(draft.storeResponseTimeoutMinutes),
          deliveryFeeTiers: draft.deliveryFeeTiers.map((tier) => ({ upToKm: Number(tier.upToKm), fee: Number(tier.fee) })),
          orderingOpensMinute,
          orderingClosesMinute,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save delivery settings.');
      const next = body as DeliverySettings;
      setSaved(next);
      // The server sorts tiers; show them in the order they will apply.
      setDraft((current) => current && { ...current, deliveryFeeTiers: next.deliveryFeeTiers.map((tier) => ({ upToKm: String(tier.upToKm), fee: String(tier.fee) })) });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save delivery settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form id="settings-form" className="mx-auto flex max-w-2xl flex-col gap-6" onSubmit={(event) => {
      event.preventDefault();
      if (isDirty) void handleSaveDelivery();
      if (isCommissionDirty) void handleSaveCommission();
    }}>
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
          Applies to every customer order right now — the next checkout uses whatever is saved here, no app release needed.
        </p>

        {!draft ? (
          <p className="text-sm text-muted">{saveError ?? 'Loading…'}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {([
              ['checkoutHoldMinutes', 'Online checkout hold', 16, 60, 'Time to complete payment. New checkouts use this value.'],
              ['checkoutReconciliationGraceMinutes', 'Payment confirmation grace', 5, 120, 'Time to reconcile delayed payment before releasing reserved stock.'],
            ] as const).map(([key, label, min, max, description]) => (
              <div key={key} className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <div><label htmlFor={key} className="text-sm font-medium text-ink">{label}</label><p className="text-xs text-muted">{description}</p></div>
                <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                  <input id={key} type="number" min={min} max={max} step={1} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} className="w-16 bg-transparent text-sm font-semibold text-ink outline-none" />
                  <span className="text-sm text-muted">min</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <label htmlFor="delivery-estimate" className="text-sm font-medium text-ink">Estimated delivery time</label>
                <p className="text-xs text-muted">One estimate for the home header, products and cart. New orders keep the time saved when placed.</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <input id="delivery-estimate" type="number" min={1} max={240} step={1}
                  value={draft.estimatedDeliveryMinutes}
                  onChange={(event) => setDraft({ ...draft, estimatedDeliveryMinutes: event.target.value })}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none" />
                <span className="text-sm text-muted">min</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <label htmlFor="store-response" className="text-sm font-medium text-ink">Store response time</label>
                <p className="text-xs text-muted">
                  A new order the shop has not accepted within this time is cancelled automatically (reason &ldquo;store did not
                  respond&rdquo;), its stock released and any payment refunded. The partner app counts down the same time.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <input id="store-response" type="number" min={3} max={120} step={1}
                  value={draft.storeResponseTimeoutMinutes}
                  onChange={(event) => setDraft({ ...draft, storeResponseTimeoutMinutes: event.target.value })}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none" />
                <span className="text-sm text-muted">min</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium text-ink">Ordering hours (IST)</p>
                <p className="text-xs text-muted">
                  Customers can place orders between these times every day. Outside them the app shows the reopening
                  time and checkout is refused. A closing time of 12:00 AM means midnight.
                </p>
              </div>
              {([
                ['orderingOpens', 'Opens at'],
                ['orderingCloses', 'Closes at'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label htmlFor={key} className="text-sm text-ink">{label}</label>
                  <input id={key} type="time" step={60} required
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm font-semibold text-ink outline-none" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium text-ink">Delivery area</p>
                <p className="text-xs text-muted">
                  A shop delivers up to its own radius (set on the store&apos;s page) or this default. Distance is the straight
                  line × the road factor, because rivers and backwaters make real roads longer.
                </p>
              </div>
              {([
                ['defaultDeliveryRadiusKm', 'Default delivery radius', 'km', 0.5, 50, 0.5],
                ['roadDistanceFactor', 'Road distance factor', '×', 1, 3, 0.05],
                ['maxStoreSpreadKm', 'Max distance between shops in one order', 'km', 0, 50, 0.5],
              ] as const).map(([key, label, unit, min, max, step]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <label htmlFor={key} className="text-sm text-ink">
                    {label}
                    {key === 'maxStoreSpreadKm' && <span className="block text-xs text-muted">0 = no limit</span>}
                  </label>
                  <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                    <input id={key} type="number" min={min} max={max} step={step}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      className="w-16 bg-transparent text-sm font-semibold text-ink outline-none" />
                    <span className="text-sm text-muted">{unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium text-ink">Delivery fee by distance</p>
                <p className="text-xs text-muted">
                  Priced by road distance to the farthest shop in the order. Past the last tier, the last tier&apos;s fee applies.
                </p>
              </div>
              {draft.deliveryFeeTiers.map((tier, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <span>Up to</span>
                    <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                      <input aria-label={`Tier ${index + 1} distance`} type="number" min={0.1} max={50} step={0.5}
                        value={tier.upToKm}
                        onChange={(e) => setDraft({ ...draft, deliveryFeeTiers: draft.deliveryFeeTiers.map((t, i) => i === index ? { ...t, upToKm: e.target.value } : t) })}
                        className="w-12 bg-transparent text-sm font-semibold text-ink outline-none" />
                      <span className="text-sm text-muted">km</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                      <span className="text-sm text-muted">₹</span>
                      <input aria-label={`Tier ${index + 1} fee`} type="number" min={0}
                        value={tier.fee}
                        onChange={(e) => setDraft({ ...draft, deliveryFeeTiers: draft.deliveryFeeTiers.map((t, i) => i === index ? { ...t, fee: e.target.value } : t) })}
                        className="w-14 bg-transparent text-sm font-semibold text-ink outline-none" />
                    </div>
                    <button type="button" aria-label={`Remove tier ${index + 1}`}
                      onClick={() => setDraft({ ...draft, deliveryFeeTiers: draft.deliveryFeeTiers.filter((_, i) => i !== index) })}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-red-600">Remove</button>
                  </div>
                </div>
              ))}
              {draft.deliveryFeeTiers.length < 10 && (
                <button type="button"
                  onClick={() => setDraft({ ...draft, deliveryFeeTiers: [...draft.deliveryFeeTiers, { upToKm: '', fee: '' }] })}
                  className="self-start rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-ink">+ Add tier</button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Fallback delivery fee</p>
                <p className="text-xs text-muted">Used only when no distance tiers are set above.</p>
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
                <label htmlFor="extraStopFee" className="text-sm font-medium text-ink">Extra store fee</label>
                <p className="text-xs text-muted">
                  Charged to the customer for each store after the first in a multi-store order. Waived with free delivery.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <span className="text-sm text-muted">₹</span>
                <input
                  id="extraStopFee"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.extraStopFee}
                  onChange={(e) => setDraft({ ...draft, extraStopFee: e.target.value })}
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

            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <label htmlFor="riderBasePayout" className="text-sm font-medium text-ink">Minimum rider payout per delivery</label>
                <p className="text-xs text-muted">
                  For each order or multi-store trip the rider earns the higher of this amount and the delivery fee the customer
                  paid (not counting the extra-store fee, which is paid through the payout below), so a free-delivery order still
                  pays this amount. Set to 0 to pay riders exactly the delivery fee the customer paid
                  (the per-extra-store payout below is then not added).
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <span className="text-sm text-muted">₹</span>
                <input
                  id="riderBasePayout"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.riderBasePayout}
                  onChange={(e) => setDraft({ ...draft, riderBasePayout: e.target.value })}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
              <div>
                <label htmlFor="riderExtraStopPayout" className="text-sm font-medium text-ink">Rider payout per extra store</label>
                <p className="text-xs text-muted">
                  Added on top of the minimum payout for each store after the first on a multi-store trip. Applies only when the
                  minimum rider payout is above 0.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-border px-3 py-2">
                <span className="text-sm text-muted">₹</span>
                <input
                  id="riderExtraStopPayout"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.riderExtraStopPayout}
                  onChange={(e) => setDraft({ ...draft, riderExtraStopPayout: e.target.value })}
                  className="w-16 bg-transparent text-sm font-semibold text-ink outline-none"
                />
              </div>
            </div>

            {saveError && <p className="text-xs font-medium text-red-600">{saveError}</p>}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              {isDirty && !isSaving && <span className="text-xs text-muted">Unsaved changes</span>}
              {saved && !isDirty && !isSaving && !saveError && <span role="status" className="text-xs text-green-700">Changes saved</span>}
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
          The cut Gloceries takes from every store&apos;s order — was hardcoded, now applies to the very next checkout.
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
    </form>
  );
}
