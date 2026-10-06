import { mapApiProduct } from '../../../../api/products';
import { useDistrictBrands } from '../brands-around-here/useDistrictBrands';
import { COCONUT_OIL_PREVIEWS, isEdibleCoconutOil } from './data';

export function useCoconutOilProducts() {
  const inventory = useDistrictBrands();
  const brands = inventory.previewOnly ? [] : inventory.brands;
  const localIds = new Set(brands.flatMap((brand) => brand.productIds));
  const stock = [...new Map(inventory.visibleProducts.filter(isEdibleCoconutOil).map((product) => [product.id, product])).values()];
  // Checked district brands first; retain nearest-store order within each group.
  stock.sort((a, b) => Number(localIds.has(b.id)) - Number(localIds.has(a.id)));
  const realProducts = stock.map((product) => {
    const brand = brands.find((item) => item.productIds.includes(product.id));
    return { ...mapApiProduct(product), brandOrigin: brand?.origin };
  });
  const previewOnly = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DESIGN_PREVIEWS === 'true' && realProducts.length === 0;
  const products = previewOnly ? COCONUT_OIL_PREVIEWS.map((product) => ({ ...product, brandOrigin: undefined })) : realProducts;
  return { ...inventory, products, previewOnly };
}
