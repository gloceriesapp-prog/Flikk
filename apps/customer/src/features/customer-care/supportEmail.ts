export type IssueCategory = 'missing_items' | 'damaged_products' | 'payment' | 'delivery' | 'general';
export interface SupportTarget { orderId: string; isTrip?: boolean }

export const DEFAULT_SUPPORT_EMAIL = 'hello@gloceries.com';
const SUBJECTS: Record<IssueCategory, string> = {
  missing_items: 'Missing items', damaged_products: 'Damaged products',
  payment: 'Payment or refund', delivery: 'Delivery issue', general: 'Help with Gloceries',
};

export function supportEmailAddress(configured: string | null | undefined): string {
  const email = configured?.trim() ?? '';
  return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email)
    ? email : DEFAULT_SUPPORT_EMAIL;
}

// Only the selected order reference is prefilled. No phone, location, auth
// token or message body is attached; the user writes and sends in their mail app.
export function supportEmailUrl(email: string, category: IssueCategory = 'general', target?: SupportTarget): string {
  const reference = target && /^[0-9a-f-]{36}$/i.test(target.orderId)
    ? ` — ${target.isTrip ? 'Trip' : 'Order'} ${target.orderId}` : '';
  return `mailto:${encodeURIComponent(supportEmailAddress(email))}?subject=${encodeURIComponent(`Gloceries support: ${SUBJECTS[category] ?? SUBJECTS.general}${reference}`)}`;
}
