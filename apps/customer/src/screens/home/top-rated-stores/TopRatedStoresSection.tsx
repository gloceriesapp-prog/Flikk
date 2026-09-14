// "Top Rated Stores Near You" — Home's "All" tab, right before
// DealsSection (trust signal right before a purchase nudge, per the agreed
// Home section order). Reuses StoreTileCard (home/components/, shared with
// NearbyStoresSection/NewOnFlikkSection) — this section owns nothing
// visually beyond its own title and which real stores it hands that card.
//
// Renders nothing until at least one store in the zone has a real rating
// (useTopRatedStores' own note) — never a placeholder row of unrated
// stores just to fill the space.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, View } from 'react-native';
import { StoreTileCard } from '../components/StoreTileCard';
import { useTopRatedStores } from './useTopRatedStores';
import type { AppStackParamList } from '../../../navigation/types';

export function TopRatedStoresSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: stores = [] } = useTopRatedStores();

  if (stores.length === 0) return null;

  return (
    <View className="pt-8">
      <Text className="mb-4 px-5 text-[18.5px] font-semibold text-black/80">Top Rated Stores Near You</Text>

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
              metaLabel: `★ ${store.rating!.toFixed(1)}`,
            }}
            onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
