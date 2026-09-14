// Maps to POST /promos/validate (backend/src/routes/promos.ts). CartScreen's
// "Apply" button calls this to show the discount before checkout; the
// actual discount charged is always recomputed server-side inside POST
// /orders or POST /trips (promo_code passed alongside the rest of the
// cart) — this call is a preview, never the source of truth.

import { apiRequest, ApiError } from './client';

export interface ValidatePromoResult {
  valid: true;
  discount_amount: number;
}

export async function validatePromoCode(code: string, itemTotal: number): Promise<{ discountAmount: number } | { error: string }> {
  try {
    const result = await apiRequest<ValidatePromoResult>('/promos/validate', {
      method: 'POST',
      body: { code, item_total: itemTotal },
    });
    return { discountAmount: result.discount_amount };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Could not apply this code.' };
  }
}
