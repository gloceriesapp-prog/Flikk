// Privacy policy and terms links for the Profile menu, fetched from
// GET /app-config and parsed by legalLinks.ts (fallbacks on any failure).
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './client';
import { FALLBACK_LEGAL_LINKS, parseLegalLinks, type LegalLinks } from './legalLinks';

export function useLegalLinks(): LegalLinks {
  const { data } = useQuery({
    queryKey: ['app-config', 'legal', 'rider'],
    queryFn: async () => parseLegalLinks(await apiRequest<unknown>('/app-config?app=rider', { auth: false })),
    staleTime: 10 * 60_000,
  });
  return data ?? FALLBACK_LEGAL_LINKS;
}
