import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { CategoryDetailHeader } from '../../../category-detail/components/CategoryDetailHeader';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { FreshSectionState } from '../components/FreshSectionState';
import { useHomeGrowers } from './useHomeGrowers';

export function HomeGrownProduceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const nearby = useHomeGrowers();
  const products = [...new Map(nearby.growers.flatMap((grower) => grower.products).map((product) => [product.id, product])).values()];
  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader title="Home-grown Nearby" onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />
      {nearby.previewOnly && <Text className="px-5 pb-2 text-[11px] text-ink/50">Design preview · Sample produce, not verified grower listings</Text>}
      {products.length > 0 ? (
        <FlashList data={products} numColumns={2} keyExtractor={(product) => product.id} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }} renderItem={({ item }) => <View className="flex-1 px-1 pb-6"><GroceryProductTile product={item} previewOnly={nearby.previewOnly} /></View>} />
      ) : <View className="flex-1 justify-center"><FreshSectionState {...nearby} emptyMessage="No verified home growers with available produce nearby yet." /></View>}
    </View>
  );
}
