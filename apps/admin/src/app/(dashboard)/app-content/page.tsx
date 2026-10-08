'use client';

// App content — every customer-facing string that isn't catalogue data:
// legal links, support contacts, About text and free-form UI copy. Backed by
// the app_content singleton via app/api/app-content; the customer app reads
// it through the backend's GET /app-config (cached ~1 min), so a save shows
// up without an app release. Same load()/save() shape as festival-greeting.

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  COPY_KEY_PATTERN,
  COPY_MAX_KEYS,
  COPY_VALUE_MAX,
  REGISTERED_COPY_KEYS,
  type AppContent,
} from '@/lib/appContentValidation';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

interface CopyRow {
  id: number;
  key: string;
  value: string;
  // Registered keys (customer app reads them) are always listed, key locked.
  registered?: boolean;
}

const INPUT =
  'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/10';

let nextRowId = 1;
const REGISTERED = new Map(REGISTERED_COPY_KEYS.map((k) => [k.key, k]));
const toRows = (copy: Record<string, string>): CopyRow[] => [
  ...REGISTERED_COPY_KEYS.map((k) => ({ id: nextRowId++, key: k.key, value: copy[k.key] ?? '', registered: true })),
  ...Object.keys(copy).filter((key) => !REGISTERED.has(key)).sort().map((key) => ({ id: nextRowId++, key, value: copy[key] })),
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export default function AppContentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<AppContent, 'copy' | 'updatedAt'>>({
    termsUrl: '',
    privacyUrl: '',
    refundPolicyUrl: '',
    supportPhone: '',
    supportEmail: '',
    supportWhatsapp: '',
    aboutTitle: 'About Gloceries',
    aboutBody: '',
  });
  const [rows, setRows] = useState<CopyRow[]>([]);

  const apply = useCallback((data: AppContent) => {
    setForm({
      termsUrl: data.termsUrl ?? '',
      privacyUrl: data.privacyUrl ?? '',
      refundPolicyUrl: data.refundPolicyUrl ?? '',
      supportPhone: data.supportPhone ?? '',
      supportEmail: data.supportEmail ?? '',
      supportWhatsapp: data.supportWhatsapp ?? '',
      aboutTitle: data.aboutTitle,
      aboutBody: data.aboutBody,
    });
    setRows(toRows(data.copy));
    setSavedAt(data.updatedAt);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/app-content');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not load app content.');
      apply(body as AppContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load app content.');
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const updateRow = (id: number, patch: Partial<CopyRow>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addRow = (key = '') => setRows((prev) => [...prev, { id: nextRowId++, key, value: '' }]);

  const keyCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.key.trim()] = (acc[row.key.trim()] ?? 0) + 1;
    return acc;
  }, {});
  const keyProblem = (row: CopyRow): string | null => {
    const key = row.key.trim();
    if (!COPY_KEY_PATTERN.test(key)) return 'Use dotted lowercase keys, e.g. cart.empty.title';
    return keyCounts[key] > 1 ? 'Duplicate key' : null;
  };
  const valueProblem = (row: CopyRow) => (row.value.length > COPY_VALUE_MAX ? `Max ${COPY_VALUE_MAX} characters` : null);
  const hasRowProblems = rows.some((row) => keyProblem(row) || valueProblem(row));

  async function handleSave() {
    if (hasRowProblems) {
      setError('Fix the highlighted UI copy rows before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Empty values are not stored — the app falls back to its default.
      const copy = Object.fromEntries(rows.filter((row) => row.value.trim()).map((row) => [row.key.trim(), row.value]));
      const res = await fetch('/api/app-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, copy }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Save failed.');
      apply(body as AppContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">App content</h1>
        <p className="text-sm text-muted">
          Customer-facing links, contacts and text. Changes reach the customer app within about a minute — no release needed.
        </p>
      </div>

      {error && <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Legal links</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Terms of service" hint="https:// only">
            <input type="url" value={form.termsUrl ?? ''} onChange={set('termsUrl')} placeholder="https://…" className={INPUT} />
          </Field>
          <Field label="Privacy policy" hint="https:// only">
            <input type="url" value={form.privacyUrl ?? ''} onChange={set('privacyUrl')} placeholder="https://…" className={INPUT} />
          </Field>
          <Field label="Refund policy" hint="https:// only">
            <input type="url" value={form.refundPolicyUrl ?? ''} onChange={set('refundPolicyUrl')} placeholder="https://…" className={INPUT} />
          </Field>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Support contacts</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Phone" hint="International format, e.g. +919876543210">
            <input type="tel" value={form.supportPhone ?? ''} onChange={set('supportPhone')} placeholder="+91…" className={INPUT} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.supportEmail ?? ''} onChange={set('supportEmail')} placeholder="help@…" className={INPUT} />
          </Field>
          <Field label="WhatsApp" hint="International format, e.g. +919876543210">
            <input type="tel" value={form.supportWhatsapp ?? ''} onChange={set('supportWhatsapp')} placeholder="+91…" className={INPUT} />
          </Field>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">About</h2>
        <div className="flex flex-col gap-4">
          <Field label="Title">
            <input value={form.aboutTitle} onChange={set('aboutTitle')} maxLength={120} className={INPUT} />
          </Field>
          <Field label="Body" hint={`${form.aboutBody.length} / 10,000 characters`}>
            <textarea value={form.aboutBody} onChange={set('aboutBody')} rows={6} maxLength={10000} className={INPUT} />
          </Field>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">UI copy</h2>
          <span className="text-xs text-muted">
            {rows.filter((r) => r.value.trim()).length} / {COPY_MAX_KEYS} overrides
          </span>
        </div>
        <p className="mb-4 text-xs text-muted">Every text the customer app reads is listed with its built-in default (shown greyed). Type to override; leave empty to keep the default.</p>

        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const badKey = keyProblem(row);
            const problem = badKey ?? valueProblem(row);
            const registered = REGISTERED.get(row.key.trim());
            const hint = registered?.hint;
            return (
              <div key={row.id} className="rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start">
                  <input
                    value={row.key}
                    readOnly={row.registered}
                    onChange={(e) => updateRow(row.id, { key: e.target.value })}
                    placeholder="screen.element.name"
                    aria-label="Copy key"
                    className={`${INPUT} font-mono md:w-72 ${badKey ? 'border-danger' : ''}`}
                  />
                  {registered?.image && (
                    <ProductImageUpload imageUrl={row.value || undefined} onChange={(url) => updateRow(row.id, { value: url })} bucket="banners" />
                  )}
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    placeholder={registered?.image ? '(built-in artwork) — upload or paste an https:// link' : registered ? registered.defaultValue || '(app built-in text / none)' : 'Text shown in the app'}
                    aria-label={`Value for ${row.key || 'new key'}`}
                    className={`${INPUT} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => row.registered ? updateRow(row.id, { value: '' }) : setRows((prev) => prev.filter((r) => r.id !== row.id))}
                    aria-label={row.registered ? `Reset ${row.key} to default` : `Delete ${row.key || 'row'}`}
                    className="self-center text-muted hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {(problem || hint) && (
                  <p className={`mt-1 text-[11px] ${problem ? 'text-danger' : 'text-muted'}`}>{problem ?? hint}</p>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-muted">No overrides yet — the app uses its defaults.</p>}
        </div>

        <button
          type="button"
          onClick={() => addRow()}
          disabled={rows.length >= COPY_MAX_KEYS}
          className="mt-3 flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-accent disabled:opacity-40"
        >
          <Plus size={14} />
          Add key
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && <span className="text-xs text-muted">Last saved {new Date(savedAt).toLocaleString('en-IN')}</span>}
      </div>
    </div>
  );
}
