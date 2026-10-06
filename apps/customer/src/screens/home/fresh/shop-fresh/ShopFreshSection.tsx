import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { FRESH_CATEGORIES } from './data';
import { FreshCategoryTile } from './FreshCategoryTile';

export function ShopFreshSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { visibleProducts } = useNearbyGroceryInventory();

  return (
    <View className="pt-8">
      <SectionTitle>Shop Fresh</SectionTitle>
      <View className="px-5">
        <View className="-mx-1.5 flex-row flex-wrap gap-y-5">
          {FRESH_CATEGORIES.map((category) => {
            const imageUrl = selectBalancedProducts(visibleProducts, category.groups, visibleProducts.length).find((product) => product.image_url)?.image_url ?? undefined;
            return (
              <View key={category.id} className="px-1.5" style={{ width: '33.333333%' }}>
                <FreshCategoryTile category={category} imageUrl={imageUrl} onPress={() => navigation.navigate('FreshCategory', { categoryId: category.id })} />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
