import { apiRequest } from '../../api/client';
export type IssueCategory = 'missing_items' | 'damaged_products' | 'payment' | 'delivery' | 'general';
export const ISSUE_LABELS: Record<IssueCategory, string> = { missing_items: 'Missing items', damaged_products: 'Damaged products', payment: 'Payment or refund', delivery: 'Delivery issue', general: 'Something else' };
export interface SupportTarget {
    orderId: string;
    isTrip?: boolean;
}
export interface Ticket {
    id: string;
    order_id: string | null;
    trip_id: string | null;
    category: IssueCategory;
    status: 'open' | 'in_progress' | 'resolved';
    initial_message: string;
    created_at: string;
    updated_at: string;
}
export interface Message {
    id: string;
    actor_role: 'customer' | 'admin';
    body: string;
    status_after: string;
    created_at: string;
}
export interface SupportOrder {
    id: string;
    trip_id: string | null;
    order_number: string;
    status: string;
    placed_at: string;
    stores: {
        name: string;
    } | null;
}
export interface Refund {
    id: string;
    kind: 'order' | 'trip';
    target_id: string;
    reference: string;
    amount: number;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    reason: string;
    destination: string;
    order_placed_at: string;
    updated_at: string | null;
}
export interface RefundUpdate {
    id: number;
    status: string;
    amount: number;
    reason: string | null;
    destination: string;
    created_at: string;
}
export const requestId = () => apiRequest<{
    id: string;
}>('/support/request-id');
export const getTickets = (offset = 0) => apiRequest<Ticket[]>(`/support/tickets?offset=${offset}`);
export const getSupportOrders = (offset = 0) => apiRequest<SupportOrder[]>(`/support/orders?offset=${offset}`);
export const getThread = (id: string, offset = 0) => apiRequest<{
    ticket: Ticket;
    messages: Message[];
}>(`/support/tickets/${id}?offset=${offset}`);
export const createTicket = (body: {
    request_id: string;
    order_id?: string;
    trip_id?: string;
    category: IssueCategory;
    message: string;
}) => apiRequest<{
    id: string;
}>('/support/tickets', { method: 'POST', body });
export const replyTicket = (id: string, body: {
    request_id: string;
    message: string;
}) => apiRequest(`/support/tickets/${id}/messages`, { method: 'POST', body });
export const getRefunds = (offset = 0) => apiRequest<Refund[]>(`/customer-refunds?offset=${offset}`);
export const getRefund = (kind: 'order' | 'trip', id: string, offset = 0) => apiRequest<{
    refund: Refund;
    updates: RefundUpdate[];
}>(`/customer-refunds/${kind}/${id}?offset=${offset}`);
