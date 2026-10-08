// GET /home/festival-greeting (public, unauthenticated) — admin-driven
// festival greeting content (on/off toggle, title/tagline copy, the 3
// category boxes) and the festival tab config (migration 112: on/off, title,
// colours, artwork). Kept live by the home realtime 'content' event
// (useHomeContent.ts). When the call fails the festival tab stays off.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';
import { DISABLED_FESTIVAL_TAB, mapFestivalTabConfig, type FestivalTabConfig } from '../data';

export interface FestivalGreeting {
  isActive: boolean;
  title: string;
  tagline: string;
  categories: { id: string; title: string }[];
  tab: FestivalTabConfig;
}

export function useFestivalGreeting() {
  return useQuery({
    staleTime: 300_000,
    gcTime: 30 * 60_000,
    queryKey: ['home', 'festival-greeting'],
    queryFn: async (): Promise<FestivalGreeting> => {
      const body = await apiRequest<Omit<FestivalGreeting, 'tab'> & { tab?: unknown }>('/home/festival-greeting', { auth: false });
      return { ...body, tab: mapFestivalTabConfig(body.tab) };
    },
  });
}

export function useFestivalTabConfig(): FestivalTabConfig {
  return useFestivalGreeting().data?.tab ?? DISABLED_FESTIVAL_TAB;
}
