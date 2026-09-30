import { GroceryCollectionScreen } from '../components/GroceryCollectionScreen';
import { BREAKFAST_GROUPS } from './data';

export function BreakfastEssentialsScreen() {
  return <GroceryCollectionScreen title="Breakfast Essentials" groups={BREAKFAST_GROUPS} />;
}
