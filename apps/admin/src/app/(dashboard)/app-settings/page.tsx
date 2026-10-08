'use client';

// App settings — per app (customer, partner, rider): minimum supported and
// latest version, store links, force update and maintenance mode; plus the
// customer FAQ shown in Help & support. Apps check this on launch and every
// minute (backend GET /app-config/release/:app):
//   - below the minimum (or below latest with force update on): a blocking
//     "Update required" screen with the store link;
//   - below latest: a dismissible "Update available" notice;
//   - maintenance on: a full-screen maintenance message.

import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';

type AppKey = 'customer' | 'partner' | 'rider';
interface ReleaseRow {
  app: AppKey; min_supported_version: string; latest_version: string; ios_store_url: string | null; android_store_url: string | null;
  force_update: boolean; maintenance_enabled: boolean; maintenance_message: string | null; updated_at: string;
}
interface FaqRow { id: string; question: string; answer: string; sort_order: number; is_active: boolean }
interface ReleaseDraft {
  minSupportedVersion: string; latestVersion: string; iosStoreUrl: string; androidStoreUrl: string;
  forceUpdate: boolean; maintenanceEnabled: boolean; maintenanceMessage: string;
}

const APPS: { key: AppKey; label: string }[] = [
  { key: 'customer', label: 'Customer app' }, { key: 'partner', label: 'Partner (store) app' }, { key: 'rider', label: 'Rider app' },
];
const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

function toDraft(row: ReleaseRow | undefined): ReleaseDraft {
  return {
    minSupportedVersion: row?.min_supported_version ?? '0.0.0', latestVersion: row?.latest_version ?? '0.0.0',
    iosStoreUrl: row?.ios_store_url ?? '', androidStoreUrl: row?.android_store_url ?? '',
    forceUpdate: row?.force_update ?? false, maintenanceEnabled: row?.maintenance_enabled ?? false, maintenanceMessage: row?.maintenance_message ?? '',
  };
}

function ReleaseCard({ app, label, row, onSaved }: { app: AppKey; label: string; row: ReleaseRow | undefined; onSaved: () => void }) {
  const [draft, setDraft] = useState<ReleaseDraft>(() => toDraft(row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (draft.maintenanceEnabled && !row?.maintenance_enabled
      && !window.confirm(`Turn on maintenance for the ${label.toLowerCase()}? Everyone using it is blocked until you turn it off.`)) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch('/api/app-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app, ...draft }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not save.');
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const field = (key: 'minSupportedVersion' | 'latestVersion' | 'iosStoreUrl' | 'androidStoreUrl', title: string, placeholder: string) => (
    <div>
      <label htmlFor={`${app}-${key}`} className="mb-1.5 block text-xs font-medium text-muted">{title}</label>
      <input id={`${app}-${key}`} value={draft[key]} placeholder={placeholder} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className={inputClass} />
    </div>
  );

  return (
    <div className={clsx('rounded-3xl border bg-card p-5', draft.maintenanceEnabled ? 'border-danger/40' : 'border-border')}>
      <h2 className="mb-3 text-sm font-semibold text-ink">{label}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {field('minSupportedVersion', 'Minimum supported version', '1.0.0')}
        {field('latestVersion', 'Latest version', '1.2.0')}
        {field('iosStoreUrl', 'App Store link', 'https://apps.apple.com/…')}
        {field('androidStoreUrl', 'Play Store link', 'https://play.google.com/store/apps/details?id=…')}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={draft.forceUpdate} onChange={(e) => setDraft({ ...draft, forceUpdate: e.target.checked })} className="h-4 w-4 rounded border-border" />
          Force update: anyone below the latest version must update
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={draft.maintenanceEnabled} onChange={(e) => setDraft({ ...draft, maintenanceEnabled: e.target.checked })} className="h-4 w-4 rounded border-border" />
          Maintenance mode: show a full-screen message instead of the app
        </label>
        <div>
          <label htmlFor={`${app}-maintenance`} className="mb-1.5 block text-xs font-medium text-muted">Maintenance message · {draft.maintenanceMessage.length}/500</label>
          <textarea id={`${app}-maintenance`} rows={2} maxLength={500} value={draft.maintenanceMessage}
            placeholder="We are making some improvements. Please check back shortly." onChange={(e) => setDraft({ ...draft, maintenanceMessage: e.target.value })} className={inputClass} />
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-medium text-danger">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && !saving && <span role="status" className="text-xs text-green-700">Saved. Apps pick it up within about a minute.</span>}
      </div>
    </div>
  );
}

function FaqEditor({ faq, onChanged }: { faq: FaqRow | null; onChanged: () => void }) {
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [sortOrder, setSortOrder] = useState(String(faq?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(faq?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(faq ? `/api/app-settings/faqs/${faq.id}` : '/api/app-settings/faqs', {
        method: faq ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, sortOrder: Number(sortOrder), isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not save.');
      if (!faq) { setQuestion(''); setAnswer(''); setSortOrder('0'); setIsActive(true); }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!faq || !window.confirm('Delete this FAQ?')) return;
    setBusy(true);
    const res = await fetch(`/api/app-settings/faqs/${faq.id}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) { setError('Could not delete.'); return; }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[#F9FAFB] p-4">
      <input aria-label="Question" value={question} maxLength={300} placeholder="Question" onChange={(e) => setQuestion(e.target.value)} className={inputClass} />
      <textarea aria-label="Answer" value={answer} maxLength={4000} rows={3} placeholder="Answer" onChange={(e) => setAnswer(e.target.value)} className={inputClass} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">Order
          <input type="number" step={1} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-20 rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink" />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" /> Shown in the app
        </label>
        <div className="ml-auto flex gap-2">
          {faq && <button type="button" onClick={remove} disabled={busy} className="rounded-full px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-40">Delete</button>}
          <button type="button" onClick={save} disabled={busy || !question.trim() || !answer.trim()} className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
            {faq ? 'Save' : 'Add FAQ'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export default function AppSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/app-settings');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load app settings.');
      setReleases(body.releases ?? []);
      setFaqs(body.faqs ?? []);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load app settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(load); }, [load]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">App settings</h1>
        <p className="text-sm text-muted">Required and available updates, maintenance mode, and the customer FAQ.</p>
      </div>
      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {APPS.map(({ key, label }) => (
        <ReleaseCard key={`${key}-${version}`} app={key} label={label} row={releases.find((r) => r.app === key)} onSaved={load} />
      ))}
      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">Customer FAQ</h2>
        <p className="mb-4 text-xs text-muted">Shown in the customer app under Help &amp; support, lowest order first.</p>
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => <FaqEditor key={`${faq.id}-${version}`} faq={faq} onChanged={load} />)}
          <FaqEditor key={`new-${version}`} faq={null} onChanged={load} />
        </div>
      </div>
    </div>
  );
}
