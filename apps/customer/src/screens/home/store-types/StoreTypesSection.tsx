// "Shop by Store Type" — Home's "All" tab, second section (after
// NearbyStoresSection). Every distinct category among real active stores
// (useStoreTypes.ts -> GET /stores), grouped client-side — not the product-
// frequency tabs above (CategoryTabs), this is store-type browse: Hardware,
// Paint Shop, Steel & Vessels etc, the occasional-purchase store types that
// don't belong scanned in the same fast row as Groceries/Bakery. Renders
// nothing while there are no categorized stores yet, same convention as
// every other Home section on this screen.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, View } from 'react-native';
import { useStoreTypes } from './useStoreTypes';
import { StoreTypeCard } from './StoreTypeCard';
import type { AppStackParamList } from '../../../navigation/types';

export function StoreTypesSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: storeTypes = [] } = useStoreTypes();

  if (storeTypes.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-lg font-medium text-ink">Shop by Store Type</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {storeTypes.map((storeType) => (
          <StoreTypeCard key={storeType.category} storeType={storeType} onPress={() => navigation.navigate('Store')} />
        ))}
      </ScrollView>
    </View>
  );
}
