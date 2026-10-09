// Promo code write-path validation + row mapping — used by both
// app/api/promo-codes/route.ts (POST) and app/api/promo-codes/[id]/route.ts
// (PATCH), same "one place, not two copies that can drift" pattern as
// lib/categoryValidation.ts.
//
// Mirrors backend's own PromoCodeRow shape (backend/src/lib/promos.ts) —
// this is the write side of the exact same table that route reads from at
// checkout, so the two shapes have to agree.

export interface PromoCodeWriteInput {
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderValue?: number;
  usageLimit?: number | null;
  isActive?: boolean;
  expiresAt?: string | null;
  startsAt?: string | null;
  perCustomerLimit?: number;
}

export function validatePromoCodeInput(input: Partial<PromoCodeWriteInput>): asserts input is PromoCodeWriteInput {
  if (input.perCustomerLimit !== undefined && (!Number.isInteger(input.perCustomerLimit) || input.perCustomerLimit < 1 || input.perCustomerLimit > 100)) throw new Error('Per-customer uses must be a whole number from 1 to 100.');
  for (const date of [input.startsAt, input.expiresAt]) if (date != null && (typeof date !== 'string' || !Number.isFinite(Date.parse(date)))) throw new Error('Enter a valid start and expiry date.');
  if (input.startsAt && input.expiresAt && Date.parse(input.startsAt) >= Date.parse(input.expiresAt)) throw new Error('Expiry must be after the start date.');
  if (!input.code || !input.code.trim()) throw new Error('A code is required.');
  if (input.discountType !== 'flat' && input.discountType !== 'percent') {
    throw new Error('Discount type must be flat or percent.');
  }
  if (typeof input.discountValue !== 'number' || !Number.isFinite(input.discountValue) || input.discountValue <= 0) {
    throw new Error('Discount value must be a positive number.');
  }
  if (input.discountType === 'percent' && input.discountValue > 100) {
    throw new Error('A percent discount can’t exceed 100.');
  }
  if (input.maxDiscountAmount != null && input.maxDiscountAmount <= 0) {
    throw new Error('Max discount amount must be a positive number, or left blank for uncapped.');
  }
  if (input.minOrderValue != null && input.minOrderValue < 0) {
    throw new Error('Minimum order value can’t be negative.');
  }
  if (input.usageLimit != null && input.usageLimit <= 0) {
    throw new Error('Usage limit must be a positive number, or left blank for unlimited.');
  }
}

export interface PromoCodeRow {
  code: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  usage_limit: number | null;
  is_active: boolean;
  expires_at: string | null;
  starts_at: string | null;
  per_customer_limit: number;
}

export function toPromoCodeRow(input: PromoCodeWriteInput): PromoCodeRow {
  return {
    code: input.code.trim().toUpperCase(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    max_discount_amount: input.maxDiscountAmount ?? null,
    min_order_value: input.minOrderValue ?? 0,
    usage_limit: input.usageLimit ?? null,
    is_active: input.isActive ?? true,
    expires_at: input.expiresAt ?? null,
    starts_at: input.startsAt ?? null,
    per_customer_limit: input.perCustomerLimit ?? 1,
  };
}

// Postgres unique-violation on promo_codes.code (backend/migrations/
// 019_promo_codes.sql's own `code text not null unique`) — same pattern as
// lib/categoryValidation.ts's own toCategoryErrorMessage.
export function toPromoCodeErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === '23505') {
    return 'A promo code with this code already exists — pick a different one.';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
