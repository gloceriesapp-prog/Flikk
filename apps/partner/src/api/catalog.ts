// Product-photo upload — same base64-in/public-URL-out shape as
// api/auth.ts's uploadStorePhoto, just a different endpoint/bucket
// (backend's POST /partner/product-photo -> 'product-images', see that
// route's own note). Kept out of auth.ts since this has nothing to do with
// login/session — a separate file per real concern, same split this app
// already has between auth.ts and devAuthFallback.ts.

import { apiRequest } from './client';

export async function uploadProductPhoto(base64: string, contentType: string): Promise<{ url: string }> {
  return apiRequest('/partner/product-photo', { method: 'POST', body: { base64, contentType } });
}
