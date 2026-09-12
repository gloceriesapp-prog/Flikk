// GET /home/festival-section (backend/src/routes/homeFestivalSection.ts) —
// the admin-curated shelf (apps/admin's Festival Section screen). null
// response means no section is currently live — FestivalPicksSection.tsx
// renders nothing in that case, same "no active row = section off"
// convention as seasonal/data.ts's own SEASONAL_TILES guard. Row->Product
// mapping reuses mapApiProduct, same as useDealsProducts.ts/
// useEverydayEssentials.ts — this is the exact same product+variant+store
// row shape those feeds already get from routes/stores.ts.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { mapApiProduct, type ApiProduct } from '../../../api/products';

interface ApiFestivalSection {
  title: string;
  products: ApiProduct[];
}

export function useFestivalSection() {
  return useQuery({
    queryKey: ['home', 'festival-section'],
    queryFn: async () => {
      const section = await apiRequest<ApiFestivalSection | null>('/home/festival-section', { auth: false });
      if (!section) return null;
      return { title: section.title, products: section.products.map(mapApiProduct) };
    },
  });
}
