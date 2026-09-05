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
// No "All stores near you" heading anymore, per an explicit ask — the
// flat divider-separated list (StoreFilterBar/StoreFilterSheet directly
// above already make it obvious this is the store list) speaks for
// itself without a label repeating that. Every card, including the last
// one, gets its own trailing divider + gap now (not "between items only"
// like the previous pass) — same edge-to-edge line, just consistently
// after each card rather than only before all-but-the-first.

import { View } from 'react-native';
import { StoreCard } from '../components/StoreCard';
import type { RealStore } from './useAllStores';

interface Props {
  stores: RealStore[];
}

export function AllStoresSection({ stores }: Props) {
  if (stores.length === 0) return null;

  return (
    <View className="px-5 pt-6">
      {stores.map((store) => (
        <View key={store.id} className="mb-6">
          <StoreCard store={store} />
          <View className="-mx-5 mt-6 h-px bg-gray-100" />
        </View>
      ))}
    </View>
  );
}
