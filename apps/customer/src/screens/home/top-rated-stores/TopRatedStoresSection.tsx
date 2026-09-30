// "Top Rated Stores Near You" — Home's "All" tab, right before
// DealsSection (trust signal right before a purchase nudge, per the agreed
// Home section order). Reuses StoreTileCard (home/components/, shared with
// NearbyStoresSection/NewOnGloceriesSection) — this section owns nothing
// visually beyond its own title and which real stores it hands that card.
//
// Shows real zone stores ranked rated-first (★ badge only on stores that
// actually have a rating); renders nothing only when the zone has zero
// stores at all. Pre-launch, before any review exists, this is effectively
// a "recommended stores near you" row and upgrades to a true top-rated
// ordering automatically once ratings land (useTopRatedStores' own note).

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, View } from 'react-native';
import { StoreTileCard } from '../components/StoreTileCard';
import { SectionTitle } from '../components/SectionTitle';
import { useTopRatedStores } from './useTopRatedStores';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  title?: string;
  subtitle?: string | null;
}

export function TopRatedStoresSection({ title = 'Top Rated Stores Near You', subtitle }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: stores = [] } = useTopRatedStores();

  if (stores.length === 0) return null;

  return (
    <View className="pt-8">
      <SectionTitle subtitle={subtitle}>{title}</SectionTitle>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
        {stores.map((store) => (
          <StoreTileCard
            key={store.id}
            store={{
              id: store.id,
              name: store.name,
              photoUrl: store.photoUrl,
              isOpen: store.isOpen,
              openTime: store.openTime,
              metaLabel: store.rating != null ? `★ ${store.rating.toFixed(1)}` : undefined,
            }}
            onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
