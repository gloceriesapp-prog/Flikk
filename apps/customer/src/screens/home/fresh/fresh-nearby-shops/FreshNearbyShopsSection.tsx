import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { GroceryStorePreviewCard } from '../../groceries/shops-you-know/GroceryStorePreviewCard';
import { FreshSectionState } from '../components/FreshSectionState';
import { useFreshNearbyShops } from './useFreshNearbyShops';

export function FreshNearbyShopsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const nearby = useFreshNearbyShops();
  return (
    <View className="pt-8">
      <SectionTitle>Fresh From Nearby Shops</SectionTitle>
      {nearby.stores.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5 pb-2" snapToInterval={320} snapToAlignment="start" decelerationRate="fast">
          {nearby.stores.map((store) => <GroceryStorePreviewCard key={store.id} store={store} onOpen={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })} />)}
        </ScrollView>
      ) : <FreshSectionState {...nearby} emptyMessage="No nearby shops with fresh produce available right now." />}
    </View>
  );
}
