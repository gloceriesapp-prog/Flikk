import { GroceryCollectionSection } from '../components/GroceryCollectionSection';
import { SNACKS_GROUPS } from './data';
import { SNACKS_PREVIEW_PRODUCTS } from './previewProducts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';

export function SnacksAndDrinksSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <GroceryCollectionSection title="Snacks & Drinks" groups={SNACKS_GROUPS} previewCount={6} previewProducts={SNACKS_PREVIEW_PRODUCTS} onViewMore={() => navigation.navigate('SnacksAndDrinks')} />;
}
