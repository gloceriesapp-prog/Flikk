import { useQuery } from '@tanstack/react-query';
import { supportApi } from '../../api/support';

// Admin-configured contacts; null fields mean "not configured" (hide them).
export function useSupportContacts() {
  return useQuery({ queryKey: ['support-contacts'], queryFn: supportApi.contacts, staleTime: 60_000 });
}

export function useSupportTickets() {
  return useQuery({ queryKey: ['support-tickets'], queryFn: supportApi.tickets });
}

export function useSupportOrders(enabled: boolean) {
  return useQuery({ queryKey: ['support-orders'], queryFn: supportApi.orders, enabled });
}

export function useSupportThread(ticketId: string) {
  return useQuery({ queryKey: ['support-ticket', ticketId], queryFn: () => supportApi.ticket(ticketId), refetchInterval: 15_000 });
}
