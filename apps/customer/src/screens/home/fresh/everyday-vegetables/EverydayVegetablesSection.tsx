import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { GroceryCollectionSection } from '../../groceries/components/GroceryCollectionSection';
import { VEGETABLE_GROUPS, VEGETABLE_PREVIEW_PRODUCTS } from './data';

export function EverydayVegetablesSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <GroceryCollectionSection title="Everyday Vegetables" groups={VEGETABLE_GROUPS} previewCount={6} previewProducts={VEGETABLE_PREVIEW_PRODUCTS} onViewMore={() => navigation.navigate('EverydayVegetables')} />;
}
