import { GroceryCollectionScreen } from '../components/GroceryCollectionScreen';
import { KITCHEN_GROUPS } from './data';
import { KITCHEN_PREVIEW_PRODUCTS } from './previewProducts';

export function KitchenEssentialsScreen() {
  return <GroceryCollectionScreen title="Kitchen Essentials" groups={KITCHEN_GROUPS} previewProducts={KITCHEN_PREVIEW_PRODUCTS} />;
}
