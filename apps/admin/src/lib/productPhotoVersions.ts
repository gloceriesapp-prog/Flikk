import { isOriginalProductImage } from './productImageOriginal';

export type PhotoVersion = { url: string; originalUrl: string | null; standardUrl: string | null };
type Asset = { public_url: string; source_url: string | null };
type Job = { original_url: string; result_url: string | null; status: string };
type Premium = { url: string | null; standard_url: string | null };

/** Follow this product's recorded lineage, never another product's latest photo. */
export function productPhotoVersions(urls: string[], assets: Asset[], jobs: Job[], premium: Premium[]): PhotoVersion[] {
  const source = new Map(assets.map(asset => [asset.public_url, asset.source_url]));
  const result = new Map(jobs.filter(job => job.result_url).map(job => [job.result_url!, job.original_url]));
  const paid = new Map(premium.filter(photo => photo.url).map(photo => [photo.url!, photo.standard_url]));
  function original(url: string, seen = new Set<string>()): string | null {
    if (isOriginalProductImage(url)) return url;
    if (seen.has(url)) return null;
    seen.add(url);
    const previous = source.get(url) ?? result.get(url) ?? paid.get(url);
    return previous ? original(previous, seen) : null;
  }
  return [...new Set(urls)].map(url => {
    const originalUrl = original(url);
    const cleaned = originalUrl && jobs.find(job => job.status === 'done' && job.result_url && original(job.original_url) === originalUrl)?.result_url;
    const fitted = originalUrl && assets.find(asset => asset.source_url === originalUrl && !isOriginalProductImage(asset.public_url))?.public_url;
    return { url, originalUrl, standardUrl: cleaned || fitted || (!isOriginalProductImage(url) && !paid.has(url) ? url : null) };
  });
}

export function selectPhotoVersion(url: string | undefined, style: 'none' | 'standard' | 'premium', versions: Map<string, PhotoVersion>) {
  if (!url) return undefined;
  const version = versions.get(url);
  if (style === 'none') {
    if (isOriginalProductImage(url)) return url;
    if (version?.originalUrl) return version.originalUrl;
    throw new Error('The original for one of these photos is unavailable. Upload that photo again before choosing None.');
  }
  if (version?.standardUrl) return version.standardUrl;
  if (version || isOriginalProductImage(url)) throw new Error('The standard version is unavailable. Upload this photo again to choose Standard.');
  return url;
}
