// Maps between the real public.promo_codes row and this dashboard's
// PromoCode type. No public RLS policy exists on this table (backend/
// migrations/019_promo_codes.sql's own note) — unlike lib/supabase/
// categories.ts's own pattern, there is no anon-key fetch helper here;
// every read goes through app/api/promo-codes/route.ts (service role),
// called with a plain fetch() from the page, same as lib/types.ts's
// service-role-only resources (riders, zones).

export interface PromoCodeRow {
  id: string;
  code: string;
  discount_type: 'flat' | 'percent';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_value: number;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  starts_at: string | null;
  per_customer_limit: number;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  usageLimit: number | null;
  timesUsed: number;
  isActive: boolean;
  expiresAt: string | null;
  startsAt: string | null;
  perCustomerLimit: number;
  createdAt: string;
}

export const PROMO_CODE_SELECT =
  'id, code, discount_type, discount_value, max_discount_amount, min_order_value, usage_limit, times_used, is_active, expires_at, starts_at, per_customer_limit, created_at';

export function mapRowToPromoCode(row: PromoCodeRow): PromoCode {
  // Number(...) — PostgREST serializes Postgres `numeric` as a JSON
  // string, same coercion every other money-shaped mapper in this app
  // applies (lib/supabase/deliverySettings.ts's own note).
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    maxDiscountAmount: row.max_discount_amount != null ? Number(row.max_discount_amount) : null,
    minOrderValue: Number(row.min_order_value),
    usageLimit: row.usage_limit,
    timesUsed: row.times_used,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    startsAt: row.starts_at,
    perCustomerLimit: row.per_customer_limit,
    createdAt: row.created_at,
  };
}
