import { GroceryCollectionScreen } from '../components/GroceryCollectionScreen';
import { SNACKS_GROUPS } from './data';
import { SNACKS_PREVIEW_PRODUCTS } from './previewProducts';

export function SnacksAndDrinksScreen() {
  return <GroceryCollectionScreen title="Snacks & Drinks" groups={SNACKS_GROUPS} previewProducts={SNACKS_PREVIEW_PRODUCTS} />;
}
