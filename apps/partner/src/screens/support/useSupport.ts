import { usePrivateQueryScope } from '../../network/usePrivateQueryScope';
import { useQuery } from '@tanstack/react-query';
import { supportApi } from '../../api/support';

// Admin-configured contacts; null fields mean "not configured" (hide them).
export function useSupportContacts() {
  return useQuery({ queryKey: ['support-contacts'], queryFn: supportApi.contacts, staleTime: 60_000 });
}

export function useSupportTickets() {
  const queryScope = usePrivateQueryScope();
  return useQuery({ queryKey: ['support-tickets', queryScope], queryFn: supportApi.tickets });
}

export function useSupportOrders(enabled: boolean) {
  const queryScope = usePrivateQueryScope();
  return useQuery({ queryKey: ['support-orders', queryScope], queryFn: supportApi.orders, enabled });
}

export function useSupportThread(ticketId: string) {
  const queryScope = usePrivateQueryScope();
  return useQuery({ queryKey: ['support-ticket', queryScope, ticketId], queryFn: () => supportApi.ticket(ticketId), refetchInterval: 15_000 });
}
