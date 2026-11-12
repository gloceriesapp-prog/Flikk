// Before typing, show real nearby product recommendations only.
// Category and store-type shortcuts are intentionally excluded from search.
import { Text, View } from 'react-native';
import { ProductCard } from '../../home/products/ProductCard';
import { NearYouBox } from './NearYouBox';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';

const RECOMMENDED_LIMIT = 6;
const GRID_LIMIT = 9;
const GRID_CARD_WIDTH = 'w-[31%]';

export function SearchSuggestions() {
  const { data: products = [] } = useEverydayEssentials();

  const recommended = products.slice(0, RECOMMENDED_LIMIT);
  const gridProducts = products.slice(RECOMMENDED_LIMIT, RECOMMENDED_LIMIT + GRID_LIMIT);

  return (
    <View className="pb-10 pt-1">
      {recommended.length > 0 && (
        <View>
          <NearYouBox products={recommended} />
        </View>
      )}

      {gridProducts.length > 0 && (
        <View className="pt-8">
          <Text className="mb-4 px-5 text-lg font-bold text-ink">More to explore</Text>
          <View className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-5">
            {gridProducts.map((product) => (
              <ProductCard key={product.id} product={product} widthClassName={GRID_CARD_WIDTH} showDiscountBadge />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
