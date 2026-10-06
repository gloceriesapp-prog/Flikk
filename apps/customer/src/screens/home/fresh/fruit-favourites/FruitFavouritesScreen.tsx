import { GroceryCollectionScreen } from '../../groceries/components/GroceryCollectionScreen';
import { FRUIT_GROUPS, FRUIT_PREVIEW_PRODUCTS } from './data';

export function FruitFavouritesScreen() {
  return <GroceryCollectionScreen title="Fruit Favourites" groups={FRUIT_GROUPS} previewProducts={FRUIT_PREVIEW_PRODUCTS} />;
}
