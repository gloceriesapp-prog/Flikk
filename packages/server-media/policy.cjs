'use strict';
const PUBLIC_FOLDERS = Object.freeze(['appsui', 'banners', 'categories', 'festivals', 'illustrations', 'products', 'stores']);
const LEGACY_FOLDERS = Object.freeze({ 'product-images': 'products', 'store-images': 'stores', 'category-images': 'categories', 'home-tab-images': 'appsui', 'home-tab-banner-images': 'banners' });
class MediaError extends Error {
  constructor(code, message, status = 503) { super(message); this.name = 'MediaError'; this.code = code; this.status = status; }
}
function publicFolder(value) {
  const folder = LEGACY_FOLDERS[value] || value;
  if (!PUBLIC_FOLDERS.includes(folder)) throw new MediaError('INVALID_MEDIA_FOLDER', 'Choose a valid public image folder.', 400);
  return folder;
}
function r2Config(environment) {
  const account = environment.R2_ACCOUNT_ID;
  const bucket = environment.R2_BUCKET_NAME;
  const key = environment.R2_ACCESS_KEY_ID;
  const secret = environment.R2_SECRET_ACCESS_KEY;
  if (!/^[a-f0-9]{32}$/.test(account || '') || !bucket || !key || !secret || !environment.R2_PUBLIC_BASE_URL)
    throw new MediaError('MEDIA_NOT_CONFIGURED', 'Public image storage is not configured.');
  const endpoint = `https://${account}.r2.cloudflarestorage.com`;
  if (environment.R2_ENDPOINT && environment.R2_ENDPOINT !== endpoint) throw new MediaError('MEDIA_NOT_CONFIGURED', 'R2 endpoint must match the configured account.');
  if (!environment.R2_PUBLIC_BASE_URL.startsWith('https://'))
    throw new MediaError('MEDIA_NOT_CONFIGURED', 'R2_PUBLIC_BASE_URL must start with https:// and use your public image domain.');
  let base;
  try { base = new URL(environment.R2_PUBLIC_BASE_URL); } catch { throw new MediaError('MEDIA_NOT_CONFIGURED', 'Configure an HTTPS public image domain.'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.hostname.endsWith('.r2.cloudflarestorage.com') || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
    throw new MediaError('MEDIA_NOT_CONFIGURED', 'Configure a valid public image domain and R2 bucket.');
  return { endpoint, bucket, accessKeyId: key, secretAccessKey: secret, publicBaseUrl: base.href.replace(/\/+$/, '') };
}
module.exports = { PUBLIC_FOLDERS, publicFolder, r2Config, MediaError };
