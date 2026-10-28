'use client';

// Inventory → "Show on home": tick the Home sections this product should be
// picked in. A newly ticked section adds it at the end of that section's
// picks (reorder on the Home Sections page); unticking removes it.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X } from '@/components/icons';
import { toast } from '@/components/ui/Toast';
import { HomeSectionChecklist, saveProductHomeSections, useHomeSectionChoice } from '@/components/home/HomeSectionChecklist';
import type { Product } from '@/lib/types';

export function ShowOnHomeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const choice = useHomeSectionChoice(product.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const keys = await saveProductHomeSections(product.id, choice.keys);
      toast.success('Home sections updated', keys.length ? `${product.name} is picked in ${keys.length} section${keys.length === 1 ? '' : 's'}.` : `${product.name} is no longer picked on Home.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  // Portalled to <body>: the dashboard's page transition transforms its
  // content, which would otherwise pin this "fixed" overlay to the page area.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="show-on-home-title" className="card relative w-full max-w-md animate-rise p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="show-on-home-title" className="text-base font-semibold text-ink">Show on home</h2>
            <p className="mt-1 text-sm text-ink-soft">{product.name} · {product.storeName}</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        {(product.approvalStatus ?? 'approved') !== 'approved' && (
          <p className="mt-4 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">Customers see it only after the product is approved.</p>
        )}

        <div className="mt-4">
          <HomeSectionChecklist choice={choice} />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Link href="/home-sections" className="text-[13px] font-medium text-ink hover:underline">Reorder on Home Sections</Link>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!choice.options || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
