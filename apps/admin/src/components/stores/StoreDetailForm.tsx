'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Save } from 'lucide-react';
import type { Store } from '@/lib/types';
import { STORE_CATEGORIES } from '@/lib/store-options';
import { storeDraft, changedStoreFields } from '@/features/store-management/storeDraft';
import { parseStorePatch } from '@/features/store-management/storePatch';
import { StorePhotoEditor } from '@/features/store-management/StorePhotoEditor';

const inputClass = 'w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/15 disabled:opacity-60';
export function StoreDetailForm({ store }: { store: Store }) {
  const router = useRouter();
  const savingRef = useRef(false);
  const [draft, setDraft] = useState(() => storeDraft(store));
  const [saved, setSaved] = useState(() => storeDraft(store));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dirty = Object.keys(changedStoreFields(draft, saved)).length > 0;
  const disabled = saving || uploading;
  function change(key: string, value: string | boolean) { setDraft(current => ({ ...current, [key]: value })); setSuccess(''); }
  function field(key: string, label: string, type = 'text', hint?: string) {
    return <label className="block" key={key}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input className={inputClass} disabled={disabled} maxLength={type === 'text' || type === 'tel' ? 500 : type === 'url' ? 2048 : undefined} type={type} value={String(draft[key] ?? '')} onChange={event => change(key, event.target.value)} step={type === 'number' ? 'any' : undefined} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>;
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (savingRef.current || disabled || !dirty) return;
    savingRef.current = true;
    setSaving(true); setError(''); setSuccess('');
    try {
      const patch = changedStoreFields(draft, saved);
      parseStorePatch(patch);
      const response = await fetch(`/api/stores/${store.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not save changes.');
      const next = storeDraft(body as Store); setDraft(next); setSaved(next);
      setSuccess('Store changes saved.'); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save changes. Please retry.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return (
    <form id="store-detail-form" onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-ink">{String(draft.name)}</h1><p className="mt-1 text-sm text-muted">Edit store profile · Joined {store.joinedAt}</p></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${draft.isActive ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>{draft.isActive ? 'Active store' : 'Inactive store'}</span>
      </div>
      <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-5">
        <Section title="Store profile" description="The name and photo customers see in the app.">
          <StorePhotoEditor url={String(draft.photoUrl)} disabled={saving} onChange={url => change('photoUrl', url)} onBusy={setUploading} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {field('name', 'Store name')}
            <label><span className="mb-1.5 block text-xs font-medium text-muted">Category</span><select value={String(draft.category)} onChange={event => change('category', event.target.value)} className={inputClass}>{!STORE_CATEGORIES.some(c => c === draft.category) && <option value={String(draft.category)}>{String(draft.category)}</option>}{STORE_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
            {field('ownerName', 'Owner name')}{field('phone', 'Store contact phone', 'tel')}
          </div>
          <div className="mt-4">{field('photoUrl', 'Photo URL', 'url', 'Upload above or paste a hosted image URL.')}</div>
        </Section>
        <Section title="Address & delivery" description="Set the store location and the area it delivers to.">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('addressLine', 'Street address')}{field('manualAddress', 'Landmark / directions')}
            {field('city', 'City / town')}{field('district', 'District')}{field('state', 'State')}{field('country', 'Country')}
            {field('lat', 'Latitude', 'number')}{field('lng', 'Longitude', 'number')}
            {field('deliveryRadiusKm', 'Delivery radius (km)', 'number', 'Leave blank to use the platform default.')}
          </div>
        </Section>
        <Section title="Hours & availability" description="Control opening hours, preparation time and store visibility.">
          <div className="grid gap-4 sm:grid-cols-2">{field('openTime', 'Opening time', 'time')}{field('closeTime', 'Closing time', 'time')}{field('avgPrepMinutes', 'Average preparation time (minutes)', 'number')}</div>
          <label className="mt-5 flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={Boolean(draft.isActive)} onChange={event => change('isActive', event.target.checked)} className="h-4 w-4" />Store is active and visible to customers</label>
        </Section>
        <Section title="Business documents" description="Update the business records held for this store.">
          <div className="grid gap-4 sm:grid-cols-2">
            {field('fssaiNumber', 'FSSAI number')}{field('shopEstablishmentNumber', 'Shop & Establishment registration')}
            {field('panNumber', 'PAN')}{field('aadhaarLast4', 'Aadhaar — last 4 digits')}
            {field('udyamNumber', 'Udyam registration')}{field('gstNumber', 'GSTIN')}{field('drugLicenseNumber', 'Drug licence (pharmacy)')}
          </div>
          <label className="mt-5 flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={Boolean(draft.turnoverExceedsGstThreshold)} onChange={event => change('turnoverExceedsGstThreshold', event.target.checked)} className="h-4 w-4" />GST registration is required for this business</label>
        </Section>
        <Section title="Bank record" description="Update the bank details on the store's business record.">
          <div className="grid gap-4 sm:grid-cols-2">{field('bankName', 'Bank name')}{field('bankAccountLast4', 'Bank account — last 4 digits')}</div>
        </Section>
      </fieldset>
      <div className="sticky bottom-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
        {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
        {success && <p role="status" className="mb-3 flex items-center gap-2 text-sm text-success"><Check size={16} />{success}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">{uploading ? 'Uploading photo…' : dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <div className="flex items-center gap-3">
            <button type="button" disabled={disabled || !dirty} onClick={() => { setDraft(saved); setError(''); setSuccess(''); }} className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40">Discard changes</button>
            <button type="submit" disabled={disabled || !dirty} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Save size={15} />{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </form>
  );
}
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-3xl border border-border bg-card p-6 shadow-sm"><h2 className="text-base font-bold text-ink">{title}</h2><p className="mb-5 mt-1 text-sm text-muted">{description}</p>{children}</section>;
}
