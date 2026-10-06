import { ScrollView, Text, View } from 'react-native';
import { SectionTitle } from '../../components/SectionTitle';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { FreshSectionState } from '../components/FreshSectionState';
import { useSeasonalPicks } from './useSeasonalPicks';

export function SeasonalPicksSection() {
  const seasonal = useSeasonalPicks();
  return (
    <View className="pt-8">
      <SectionTitle>Seasonal Picks</SectionTitle>
      {seasonal.previewOnly && <Text className="mb-3 px-5 text-[11px] text-ink/50">Design preview · Sample products and prices, not confirmed seasonal listings</Text>}
      {seasonal.products.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5" snapToInterval={140} snapToAlignment="start" decelerationRate="fast">
          {seasonal.products.map((product) => <View key={product.id} className="w-32"><GroceryProductTile product={product} previewOnly={seasonal.previewOnly} /></View>)}
        </ScrollView>
      ) : <FreshSectionState {...seasonal} emptyMessage="No seasonal picks available for your address right now." />}
    </View>
  );
}
