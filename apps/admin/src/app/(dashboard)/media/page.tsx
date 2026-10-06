'use client';

import { useState } from 'react';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

const folders = ['appsui', 'banners', 'categories', 'festivals', 'illustrations', 'products', 'stores'] as const;
export default function MediaPage() {
  const [folder, setFolder] = useState<typeof folders[number]>('appsui');
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <div><h1 className="text-2xl font-semibold">Public image uploads</h1><p className="mt-2 text-sm text-muted">Choose the image purpose. Public artwork is stored in R2; verification documents use private storage.</p></div>
    <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <label className="block text-sm font-medium">Image folder
        <select className="mt-2 block rounded-lg border border-border p-2" value={folder} onChange={event => { setFolder(event.target.value as typeof folder); setUrl(''); setCopied(false); }}>
          {folders.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <ProductImageUpload key={folder} imageUrl={url} bucket={folder} onChange={value => { setUrl(value); setCopied(false); }} />
      {url && <div className="space-y-3"><label className="block text-sm">Image URL<input readOnly value={url} className="mt-2 w-full rounded-lg border border-border p-2" /></label>
        <button type="button" className="rounded-lg bg-ink px-4 py-2 text-sm text-white" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy image URL'}</button>
        <p className="text-sm text-muted">Save this URL in the relevant content or product editor to publish it.</p>
      </div>}
    </section>
  </main>;
}
