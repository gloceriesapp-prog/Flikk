'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { Store } from '@/lib/partnerApi';
import { updateMyStore } from '@/lib/partnerApi';
import { SettingsSection, Field } from './SettingsSection';

interface Props {
  store: Store;
  onSaved: (store: Store) => void;
}

// KYC identifiers the backend already accepts in PATCH /partner/store
// (fssai_number, pan_number) and format-validates server-side. GST lives on
// the Store profile form, so it's intentionally not duplicated here — this
// section is the licence + PAN pair. No file upload yet: the backend stores
// the numbers, not scanned documents (no doc-storage column exists), so this
// captures what's actually persistable and nothing it can't save.
export function KycForm({ store: initial, onSaved }: Props) {
  const [store, setStore] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateMyStore({
        fssai_number: store.fssai_number,
        pan_number: store.pan_number,
      });
      setStore(updated);
      onSaved(updated);
      setSavedAt(Date.now());
    } catch (err) {
      // Backend rejects malformed FSSAI/PAN — surface it rather than swallow.
      setError(err instanceof Error ? err.message : 'Could not save. Check the format and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection title="KYC & licences" description="Regulatory details for payouts and compliance.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-xl bg-neutral-50 px-3.5 py-3 text-[13px] text-neutral-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-neutral-400" />
          <span>These are verified against government records before your first payout. Enter them exactly as on the certificate.</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="FSSAI licence number" hint="14 digits">
            <input
              value={store.fssai_number ?? ''}
              onChange={(e) => setStore({ ...store, fssai_number: e.target.value })}
              placeholder="10012345000123"
              className="input"
            />
          </Field>
          <Field label="PAN" hint="e.g. ABCDE1234F">
            <input
              value={store.pan_number ?? ''}
              onChange={(e) => setStore({ ...store, pan_number: e.target.value.toUpperCase() })}
              placeholder="ABCDE1234F"
              className="input uppercase"
            />
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-1 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          {savedAt && !error && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </form>
    </SettingsSection>
  );
}
