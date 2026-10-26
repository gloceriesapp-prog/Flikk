import { apiRequest } from '../../api/client';
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
export const getRefunds = (offset = 0) => apiRequest<Refund[]>(`/customer-refunds?offset=${offset}`);
export const getRefund = (kind: 'order' | 'trip', id: string, offset = 0) => apiRequest<{
    refund: Refund;
    updates: RefundUpdate[];
}>(`/customer-refunds/${kind}/${id}?offset=${offset}`);
