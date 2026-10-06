import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { RegionalShopCard } from './RegionalShopCard';
import { RegionalSectionState } from '../components/RegionalSectionState';
import { useRegionalShops } from './useRegionalShops';
import { PreviewShopCard } from './PreviewShopCard';

export function NearbyShopsSection() {
  const nearby = useRegionalShops();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return (
    <View className="pt-8">
      <SectionTitle>From Nearby Shops</SectionTitle>
      {nearby.stores.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5 pb-2" snapToInterval={320} snapToAlignment="start" decelerationRate="fast">
          {nearby.stores.map((store) => <RegionalShopCard key={store.id} name={store.name} products={store.products} isOpen={store.isOpen} distanceLabel={store.distanceLabel} onOpen={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })} />)}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5 pb-2" snapToInterval={320} snapToAlignment="start" decelerationRate="fast">
          {[0, 1].map((index) => <PreviewShopCard key={index} index={index} />)}
        </ScrollView>
      )}
      {nearby.stores.length === 0 && (!nearby.hasLocation || nearby.isError) && (
        <View className="mt-4"><RegionalSectionState {...nearby} loadingLabel="Loading nearby shops" emptyMessage="No nearby shops stocking these products yet." /></View>
      )}
    </View>
  );
}
