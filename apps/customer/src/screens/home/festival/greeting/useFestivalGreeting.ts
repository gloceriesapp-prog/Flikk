// GET /home/festival-greeting (public, unauthenticated) — admin-driven
// festival greeting content: on/off toggle, title/tagline copy, and the 3
// category boxes. Shape follows useFestivalSection.ts's apiRequest+react-query
// convention. Product rail stays on useFestivalProducts (nearest-store
// catalog); this hook only drives greeting text + category boxes + the
// isActive gate. When the section is off or the call fails, FestivalGreetingPanel
// keeps the default artwork/categories and hides on isActive === false.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface FestivalGreeting {
  isActive: boolean;
  title: string;
  tagline: string;
  categories: { id: string; title: string }[];
}

export function useFestivalGreeting() {
  return useQuery({
    queryKey: ['home', 'festival-greeting'],
    queryFn: () => apiRequest<FestivalGreeting>('/home/festival-greeting', { auth: false }),
  });
}
