import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, Text, View } from 'react-native';
import { SectionTitle } from '../../components/SectionTitle';
import { PromoListCard } from '../../products/PromoListCard';
import { useGroceryProducts } from './useGroceryProducts';

const TITLE = 'Your everyday essentials';

export function BestSellersSection() {
  const { data: products = [], isPending, isError, refetch } = useGroceryProducts();

  return (
    <View className="pt-3">
      {products.length > 0 ? (
        <PromoListCard title={TITLE} products={products} />
      ) : (
        <View>
          <SectionTitle>{TITLE}</SectionTitle>
          <View className="mx-5 items-center gap-3 rounded-2xl bg-mist/50 px-5 py-6">
            {isPending ? (
              <>
                <BrowseLoadingText message={BROWSE_LOADING_COPY.grocery} />
                <Text className="text-center text-sm text-ink/60">Loading your grocery picks…</Text>
              </>
            ) : isError ? (
              <>
                <Text className="text-center text-sm text-ink/60">We couldn’t load groceries. Please try again.</Text>
                <Pressable accessibilityRole="button" onPress={() => void refetch()} className="min-h-11 justify-center rounded-full bg-ink px-5">
                  <Text className="text-sm font-semibold text-white">Try again</Text>
                </Pressable>
              </>
            ) : (
              <Text className="text-center text-sm text-ink/60">Grocery picks will appear here when available.</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
