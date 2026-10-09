// Rider and store-partner support, shared by apps/partner and apps/rider.
//
// Contacts: admin "App settings" saves each app's support phone / WhatsApp /
// email (app_release_config, migration 118); the backend serves them publicly
// at GET /app-config/support/:app. A contact that isn't configured is null
// and the app hides that option rather than dialling a placeholder.
//
// Tickets: the same support system customers use (support_tickets), raised
// through the backend's /staff-support routes and answered from the admin
// Support inbox. Pure: no React, no React Native; each app passes its own
// apiRequest.
import type { RequestOptions } from '../auth/client';

export type SupportApp = 'partner' | 'rider';

export interface SupportContacts {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Anything malformed degrades to "not configured".
export function parseSupportContacts(value: unknown): SupportContacts {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const phone = text(r.phone);
  const whatsapp = text(r.whatsapp);
  const email = text(r.email);
  return {
    phone: phone && E164.test(phone) ? phone : null,
    whatsapp: whatsapp && E164.test(whatsapp) ? whatsapp : null,
    email: email && EMAIL.test(email) ? email : null,
  };
}

export function supportCallUrl(contacts: SupportContacts): string | null {
  return contacts.phone ? `tel:${contacts.phone}` : null;
}

export function supportWhatsAppUrl(contacts: SupportContacts, message?: string): string | null {
  if (!contacts.whatsapp) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${contacts.whatsapp.replace(/^\+/, '')}${query}`;
}

export function supportEmailUrl(contacts: SupportContacts, subject?: string): string | null {
  if (!contacts.email) return null;
  return `mailto:${contacts.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}

export const STAFF_SUPPORT_CATEGORIES = [
  { key: 'order_issue', label: 'An order' },
  { key: 'payout', label: 'Payouts & payments' },
  { key: 'app_issue', label: 'App problem' },
  { key: 'account', label: 'My account' },
  { key: 'general', label: 'Something else' },
] as const;
export type StaffSupportCategory = (typeof STAFF_SUPPORT_CATEGORIES)[number]['key'];

export function supportCategoryLabel(category: string): string {
  return STAFF_SUPPORT_CATEGORIES.find((c) => c.key === category)?.label ?? category.replace(/_/g, ' ');
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved';

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Waiting for support',
  in_progress: 'Support is on it',
  resolved: 'Resolved',
};

export interface SupportTicket {
  id: string;
  category: string;
  status: SupportTicketStatus;
  order_id: string | null;
  initial_message: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  actor_role: string;
  body: string;
  status_after: SupportTicketStatus;
  created_at: string;
}

export interface SupportOrderOption {
  id: string;
  order_number: string | null;
  status: string;
  placed_at: string;
  stores: { name: string } | null;
}

export interface NewSupportTicket {
  category: StaffSupportCategory;
  orderId: string | null;
  message: string;
}

// Same bounds as the backend (support/contracts.ts).
export function validateSupportMessage(message: string, minimum = 10): string | null {
  const length = message.trim().length;
  if (length < minimum) return `Write at least ${minimum} characters.`;
  if (length > 2000) return 'Keep it under 2000 characters.';
  return null;
}

type ApiRequest = <T>(path: string, options?: RequestOptions) => Promise<T>;

// Request ids make a retried create/reply idempotent server-side (the same id
// returns the same ticket/message), so callers keep one id per attempt until
// it succeeds.
export function createStaffSupportApi(apiRequest: ApiRequest, app: SupportApp) {
  return {
    contacts: async () => parseSupportContacts(await apiRequest<unknown>(`/app-config/support/${app}`, { auth: false })),
    tickets: () => apiRequest<SupportTicket[]>('/staff-support/tickets'),
    orders: () => apiRequest<SupportOrderOption[]>('/staff-support/orders'),
    ticket: (id: string) => apiRequest<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/staff-support/tickets/${id}`),
    create: (input: NewSupportTicket, requestId: string) =>
      apiRequest<{ id: string }>('/staff-support/tickets', {
        method: 'POST',
        body: { request_id: requestId, category: input.category, order_id: input.orderId, message: input.message.trim() },
      }),
    reply: (ticketId: string, message: string, requestId: string) =>
      apiRequest<{ id: string }>(`/staff-support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: { request_id: requestId, message: message.trim() },
      }),
  };
}

// RFC 4122 v4 from Math.random — only an idempotency key, not a secret.
export function newRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
