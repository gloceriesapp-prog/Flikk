import { GroceryCollectionSection } from '../components/GroceryCollectionSection';
import { KITCHEN_GROUPS } from './data';
import { KITCHEN_PREVIEW_PRODUCTS } from './previewProducts';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';

export function KitchenEssentialsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <GroceryCollectionSection title="Kitchen Essentials" groups={KITCHEN_GROUPS} previewCount={3} previewProducts={KITCHEN_PREVIEW_PRODUCTS} onViewMore={() => navigation.navigate('KitchenEssentials')} />;
}
