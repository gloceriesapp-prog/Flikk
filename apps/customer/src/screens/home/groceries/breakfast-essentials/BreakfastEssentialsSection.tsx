import { GroceryCollectionSection } from '../components/GroceryCollectionSection';
import { BREAKFAST_GROUPS } from './data';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';

export function BreakfastEssentialsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <GroceryCollectionSection title="Breakfast Essentials" groups={BREAKFAST_GROUPS} previewCount={3} onViewMore={() => navigation.navigate('BreakfastEssentials')} />;
}
