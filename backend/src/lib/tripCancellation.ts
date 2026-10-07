import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';
import { tripRefundSummary } from '../payments/tripRefunds.js';
export async function cancelCustomerTrip(tripId: string, customerId: string, reason: unknown) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tripId))
        throw new AppError(400, 'INVALID_TRIP', 'Invalid trip.');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 300)
        throw new AppError(400, 'INVALID_CANCEL_REASON', 'Provide a cancellation reason (up to 300 characters).');
    const { data, error } = await supabase.rpc('cancel_customer_trip', { p_trip_id: tripId, p_customer_id: customerId, p_reason: reason.trim() });
    if (error) {
        if (error.code === 'P0404')
            throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
        if (error.code === 'P0409')
            throw new AppError(409, 'TRIP_UNAVAILABLE', 'Shop orders are unavailable. Please retry.');
        throw new AppError(503, 'CANCELLATION_UNAVAILABLE', 'Cancellation could not be confirmed. Retry to check the outcome.');
    }
    return { ...data, refund: await tripRefundSummary(tripId) };
}
