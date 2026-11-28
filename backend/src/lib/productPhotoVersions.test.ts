import { expect, it } from 'vitest';
import { productPhotoVersions, selectPhotoVersion } from '../../../apps/admin/src/lib/productPhotoVersions';
const raw = 'https://images.test/products/0f1a2b3c-0000-4000-8000-0000000a11c0/scene.webp';
const fit = 'https://images.test/products/fitted.webp';
const cut = 'https://images.test/products/cut.webp';
const paid = 'https://images.test/products/paid.webp';
const assets = [{ public_url: fit, source_url: raw }];
const jobs = [{ original_url: raw, result_url: cut, status: 'done' }];
it('restores the correct retained original from fitted, cleaned and premium versions', () => {
  const versions = productPhotoVersions([fit, cut, paid, raw], assets, jobs, [{ url: paid, standard_url: cut }]);
  for (const version of versions) expect(version).toMatchObject({ originalUrl: raw, standardUrl: cut });
  const map = new Map(versions.map(version => [version.url, version]));
  expect(selectPhotoVersion(cut, 'none', map)).toBe(raw);
  expect(selectPhotoVersion(raw, 'standard', map)).toBe(cut);
  expect(selectPhotoVersion(paid, 'none', map)).toBe(raw);
});
it('uses the fitted version when a None upload has never entered the cut-out queue', () => {
  expect(productPhotoVersions([raw], assets, [], [])[0]).toMatchObject({ originalUrl: raw, standardUrl: fit });
});
it('does not borrow a different photo from the latest job, or loop on broken lineage', () => {
  const unknown = 'https://images.test/products/legacy.webp';
  const versions = productPhotoVersions([unknown, paid], [], jobs, [{ url: paid, standard_url: paid }]);
  expect(versions[0]).toEqual({ url: unknown, originalUrl: null, standardUrl: unknown });
  expect(versions[1]).toEqual({ url: paid, originalUrl: null, standardUrl: null });
  const map = new Map(versions.map(version => [version.url, version]));
  expect(() => selectPhotoVersion(unknown, 'none', map)).toThrow(/original.*unavailable/);
  expect(() => selectPhotoVersion(paid, 'standard', map)).toThrow(/standard version/);
  expect(selectPhotoVersion(unknown, 'standard', map)).toBe(unknown);
  expect(selectPhotoVersion(undefined, 'none', map)).toBeUndefined();
});
it('keeps an existing original and refuses a false Standard selection without a fallback', () => {
  expect(selectPhotoVersion(raw, 'none', new Map())).toBe(raw);
  expect(() => selectPhotoVersion(raw, 'standard', new Map())).toThrow(/standard version/);
});
