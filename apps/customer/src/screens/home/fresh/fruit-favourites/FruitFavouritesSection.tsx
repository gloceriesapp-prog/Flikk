import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { GroceryCollectionSection } from '../../groceries/components/GroceryCollectionSection';
import { FRUIT_GROUPS, FRUIT_PREVIEW_PRODUCTS } from './data';

export function FruitFavouritesSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <GroceryCollectionSection title="Fruit Favourites" groups={FRUIT_GROUPS} previewCount={6} previewProducts={FRUIT_PREVIEW_PRODUCTS} onViewMore={() => navigation.navigate('FruitFavourites')} />;
}
