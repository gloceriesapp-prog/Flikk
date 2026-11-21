'use client';

// Photos to review — product photos the cut-out pipeline (workers/image-cutout)
// would not publish on its own. Before (the upload) and after (cut out, on
// #F9FAFB, 720x810) side by side, with the reason and the decision buttons.

import { useCallback, useEffect, useState } from 'react';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';
import type { ProductImageJob } from '@/lib/productImageJobs';

const REASON_TEXT: Record<string, string> = {
  'cut-out quality': 'Cut-out quality — the background removal looks unreliable.',
  'low resolution': 'Low resolution — enlarged over 2x, may look blurry. Already live.',
  'too small': 'Too small — would need over 3x enlargement. Upload a bigger photo.',
};

function Photo({ url, label }: { url: string | null; label: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-xs font-medium text-muted">{label}</figcaption>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="aspect-[8/9] w-44 rounded-xl border border-border bg-[#F9FAFB] object-contain" />
      ) : (
        <div className="flex aspect-[8/9] w-44 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted">No processed photo</div>
      )}
    </figure>
  );
}

export default function ProductImagesPage() {
  const [jobs, setJobs] = useState<ProductImageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/product-images');
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Could not load photos.');
      setJobs(body as ProductImageJob[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load photos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function decide(job: ProductImageJob, action: 'accept' | 'original' | 'rerun' | 'replace', imageUrl?: string) {
    setBusyId(job.id);
    setError(null);
    try {
      const res = await fetch(`/api/product-images/${job.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, imageUrl }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not save.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusyId(null);
    }
  }

  const review = jobs.filter((job) => job.status === 'needs_review');
  const waiting = jobs.length - review.length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="page-title">Photos to review</h1>
        <p className="page-subtitle">
          Product photos the automatic cut-out would not publish on its own. {waiting > 0 ? `${waiting} more in the queue.` : ''}
        </p>
      </div>
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {!loading && review.length === 0 && <p className="card p-5 text-sm text-muted">Nothing to review.</p>}
      {review.map((job) => (
        <div key={job.id} className="card flex flex-wrap items-start gap-5 p-5">
          <Photo url={job.originalUrl} label="Before (upload)" />
          <Photo url={job.resultUrl} label="After (cut out)" />
          <div className="flex min-w-[240px] flex-1 flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {job.productName}
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted">{job.slot === 'extra' ? 'Extra photo' : 'Main photo'}</span>
              </p>
              <p className="mt-1 text-sm text-danger">{job.reason ? REASON_TEXT[job.reason] : ''}</p>
              <p className="mt-1 text-xs text-muted">Model: {job.model}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busyId === job.id || !job.resultUrl} onClick={() => void decide(job, 'accept')}
                className="rounded-xl bg-[#155DFC] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Accept</button>
              <button type="button" disabled={busyId === job.id} onClick={() => void decide(job, 'original')}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">Use original</button>
              <button type="button" disabled={busyId === job.id || job.model === 'birefnet-general'} onClick={() => void decide(job, 'rerun')}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink disabled:opacity-40">Re-run with birefnet</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ink">Re-upload:</span>
              <ProductImageUpload small imageUrl={undefined} bucket="products" onChange={(url) => decide(job, 'replace', url)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
