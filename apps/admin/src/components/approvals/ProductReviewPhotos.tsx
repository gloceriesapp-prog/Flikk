'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductImageUpload } from '@/components/inventory/ProductImageUpload';

export function ProductReviewPhotos({ product, busy, onReplace }: {
  product: Product;
  busy: boolean;
  onReplace: (endpoint: string, body: { previousUrl: string; url: string }) => Promise<boolean>;
}) {
  const [replacing, setReplacing] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const photos = [product.imageUrl, ...(product.extraImageUrls ?? [])];

  async function download(endpoint: string, index: number) {
    setDownloading(index);
    setDownloadError(null);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not download the photo.');
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `product-photo-${index + 1}.webp`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Could not download the photo.');
    } finally {
      setDownloading(null);
    }
  }

  if (!photos.some(Boolean)) return null;
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Submitted product photos" className="flex flex-wrap gap-3">
        {photos.map((url, index) => {
          if (!url?.startsWith('https://')) return null;
          const label = index === 0 ? 'Cover photo' : `Photo ${index + 1}`;
          const endpoint = `/api/products/${product.id}/approval/photo?index=${index}`;
          return (
            <li key={index} className="flex w-24 flex-col gap-1 text-xs">
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`View ${label.toLowerCase()}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- hosted product photo */}
                <img src={url} alt={label} loading="lazy" className="h-20 w-24 rounded-lg border border-border bg-card object-contain" />
              </a>
              <span className="font-medium text-ink">{label}</span>
              <div className="flex flex-col items-start gap-1 text-muted">
                <a className="underline" href={url} target="_blank" rel="noopener noreferrer">View</a>
                <button type="button" className="underline disabled:opacity-50" disabled={downloading !== null}
                  onClick={() => void download(endpoint, index)}>
                  {downloading === index ? 'Downloading…' : 'Download'}
                </button>
                <button type="button" className="underline disabled:opacity-50" disabled={busy}
                  onClick={() => setReplacing(replacing === index ? null : index)}>
                  {replacing === index ? 'Close upload' : 'Replace'}
                </button>
              </div>
              {replacing === index && (
                <ProductImageUpload small imageUrl={undefined} onChange={async (replacement) => {
                  if (!await onReplace(endpoint, { previousUrl: url, url: replacement })) {
                    throw new Error('Replacement was not saved.');
                  }
                  setReplacing(null);
                }} />
              )}
            </li>
          );
        })}
      </ul>
      {downloadError && <p role="alert" className="text-xs text-danger">{downloadError}</p>}
    </div>
  );
}
