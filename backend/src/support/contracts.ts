import { AppError } from '../lib/errors.js';
export const categories = ['missing_items', 'damaged_products', 'payment', 'delivery', 'general'] as const;
export function uuid(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
        throw new AppError(400, 'INVALID_ID', 'Invalid reference.');
    return value;
}
export function message(value: unknown, minimum = 1): string {
    if (typeof value !== 'string' || value.trim().length < minimum || value.trim().length > 2000)
        throw new AppError(400, 'INVALID_MESSAGE', `Enter ${minimum}–2000 characters.`);
    return value.trim();
}
export function ticketInput(body: Record<string, unknown>) {
    const category = body.category as typeof categories[number];
    if (!categories.includes(category))
        throw new AppError(400, 'INVALID_CATEGORY', 'Choose an issue type.');
    const orderId = body.order_id == null ? null : uuid(body.order_id);
    const tripId = body.trip_id == null ? null : uuid(body.trip_id);
    if ((orderId && tripId) || (category !== 'general' && !orderId && !tripId))
        throw new AppError(400, 'ORDER_REQUIRED', 'Choose the relevant order.');
    return { p_request_id: uuid(body.request_id), p_order_id: orderId, p_trip_id: tripId, p_category: category, p_message: message(body.message, 10) };
}
// Rider and store-partner tickets (migration 118): their own categories,
// optionally about one of their own orders (never a trip).
export const staffCategories = ['order_issue', 'payout', 'app_issue', 'account', 'general'] as const;
export function staffTicketInput(body: Record<string, unknown>) {
    const category = body.category as typeof staffCategories[number];
    if (!staffCategories.includes(category))
        throw new AppError(400, 'INVALID_CATEGORY', 'Choose an issue type.');
    const orderId = body.order_id == null || body.order_id === '' ? null : uuid(body.order_id);
    return { p_request_id: uuid(body.request_id), p_order_id: orderId, p_category: category, p_message: message(body.message, 10) };
}
export function supportError(error: {
    code?: string;
}) {
    const codes: Record<string, [
        number,
        string
    ]> = { P0400: [400, 'Choose an issue type.'], P0404: [404, 'Not found.'], '23505': [409, 'Another active case exists. Open it from your conversations.'], P0409: [409, 'This request changed. Please reopen the conversation.'], P0403: [403, 'Not permitted.'], P0429: [429, 'Please wait before sending more requests.'] };
    const [status, text] = codes[error.code ?? ''] ?? [503, 'Support is temporarily unavailable. Your request may have been saved; retry safely.'];
    return new AppError(status, 'SUPPORT_REQUEST_FAILED', text);
}
export function pageOffset(value: unknown): number {
    const offset = Number(value ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 5000)
        throw new AppError(400, 'INVALID_PAGE', 'Invalid page.');
    return offset;
}
