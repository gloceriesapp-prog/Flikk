// The full vertical store list — pulled out of StoreListScreen into its own
// file so it sits alongside ../top-stores/TopStoresSection.tsx as a sibling
// section, each with its own heading, rather than one screen file owning
// both layouts inline. Real stores (useAllStores.ts -> GET /stores), not
// the old STORE_LISTINGS mock — renders nothing while there are none, same
// convention as every Home section that reads real data.
//
// `stores` is passed in (StoreListScreen owns the single useAllStores()
// call, since StoreFilterBar/StoreFilterSheet need the same data to build
// their category options) rather than fetched again here — one real
// fetch, filtered/sorted one way, not a second independent query for the
// same rows.
//
// "All stores" heading restored per an explicit ask/reference — each card
// is now its own bordered/shadowed unit (StoreCard.tsx's own redesign),
// not a flat divider-separated list, so the section needs a real title to
// introduce it again (a bordered-card list with no heading above it reads
// like a cut-off fragment of another section).

import { Text, View } from 'react-native';
import { StoreCard } from '../components/StoreCard';
import type { RealStore } from './useAllStores';

interface Props {
  stores: RealStore[];
}

export function AllStoresSection({ stores }: Props) {
  if (stores.length === 0) return null;

  return (
    <View className="px-5 pt-6">
      <Text className="mb-4 text-[18px] font-bold text-ink tracking-[-0.35px]">All stores</Text>
      <View className="gap-4">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </View>
    </View>
  );
}
