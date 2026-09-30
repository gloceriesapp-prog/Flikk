// "New on Gloceries" — Home's "All" tab, near the end (discovery-only, least
// urgent, per the agreed Home section order). Reuses StoreTileCard
// (home/components/, shared with NearbyStoresSection/
// TopRatedStoresSection) — this section owns nothing visually beyond its
// own title and which real stores it hands that card.
//
// Renders nothing while the zone has no stores at all — same convention
// every other Home row follows. Unlike TopRatedStoresSection, this one
// never filters a store out (a brand-new store has no reviews yet, so
// "new" is exactly the honest thing to say about it).

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, View } from 'react-native';
import { StoreTileCard } from '../components/StoreTileCard';
import { SectionTitle } from '../components/SectionTitle';
import { useNewOnGloceries } from './useNewOnGloceries';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  title?: string;
  subtitle?: string | null;
}

export function NewOnGloceriesSection({ title = 'New on Gloceries', subtitle }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: stores = [] } = useNewOnGloceries();

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
              metaLabel: 'New',
            }}
            onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
