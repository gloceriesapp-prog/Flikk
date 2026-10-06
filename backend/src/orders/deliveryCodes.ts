import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

interface CustomerCode { order_id: string; code: string }
interface DeliveryResult {
  accepted: boolean;
  error?: string;
  order?: Record<string, unknown>;
}

export async function customerDeliveryCodes(customerId: string, orderIds: string[]): Promise<Map<string, string>> {
  if (!orderIds.length) return new Map();
  const { data, error } = await supabase.rpc('customer_delivery_codes', { p_customer: customerId, p_orders: orderIds });
  if (error) throw new AppError(503, 'TRACKING_UNAVAILABLE', 'Delivery details are temporarily unavailable.');
  return new Map(((data as CustomerCode[]) ?? []).map(row => [row.order_id, row.code]));
}

export async function completeDelivery(orderId: string, riderId: string, otp: unknown) {
  if (typeof otp !== 'string' || !/^\d{4}$/.test(otp)) {
    throw new AppError(400, 'INVALID_OTP', 'Enter the four-digit code from the customer.');
  }
  const { data, error } = await supabase.rpc('complete_verified_delivery', {
    p_order: orderId, p_rider: riderId, p_code: otp,
  });
  if (error) throw error;
  const result = data as DeliveryResult;
  if (!result.accepted) {
    throw new AppError(
      result.error === 'CODE_LOCKED' ? 429 : 409,
      result.error ?? 'INVALID_OTP',
      'Delivery could not be verified. Check the customer’s current code or contact support.',
    );
  }
  return result.order!;
}

export async function pruneDeliveryCodes(): Promise<void> {
  const { error } = await supabase.rpc('prune_delivery_codes');
  if (error) throw error;
}
