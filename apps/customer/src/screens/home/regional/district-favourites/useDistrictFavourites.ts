import { mapApiProduct } from '../../../../api/products';
import { useNearbyGroceryInventory } from '../../groceries/useNearbyGroceryInventory';
import { selectBalancedProducts } from '../../groceries/selectBalancedProducts';
import { DISTRICT_FAVOURITE_GROUPS, DISTRICT_FAVOURITES_LIMIT } from './data';

export function useDistrictFavourites() {
  const inventory = useNearbyGroceryInventory();
  const photographedStock = inventory.visibleProducts.filter((product) => Boolean(product.image_url?.trim()));
  const products = selectBalancedProducts(photographedStock, DISTRICT_FAVOURITE_GROUPS, DISTRICT_FAVOURITES_LIMIT).map(mapApiProduct);
  return { ...inventory, products };
}
