import { GroceryCollectionScreen } from '../../groceries/components/GroceryCollectionScreen';
import { VEGETABLE_GROUPS, VEGETABLE_PREVIEW_PRODUCTS } from './data';

export function EverydayVegetablesScreen() {
  return <GroceryCollectionScreen title="Everyday Vegetables" groups={VEGETABLE_GROUPS} previewProducts={VEGETABLE_PREVIEW_PRODUCTS} />;
}
