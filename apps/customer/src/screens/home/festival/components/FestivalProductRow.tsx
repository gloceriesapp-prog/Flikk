import { HORIZONTAL_PRODUCT_CARD_GAP, horizontalProductCardWidth } from '../../products/horizontalProductLayout';
import { ScrollView, View , useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { ContentState } from '../../content/ContentState';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { SeeAllProductsButton } from '../../groceries/components/SeeAllProductsButton';
import { useFestivalCollection, type FestivalCollectionKey } from '../collections/useFestivalCollection';
import { FestivalProductDetails } from './FestivalProductDetails';

interface Props {
  collection: FestivalCollectionKey;
  limit?: number;
  layout?: 'horizontal' | 'grid';
  buttonLabel?: string;
}

// Shared festival shelf: layout, navigation and stock states stay identical
// across campaigns. Each section supplies its collection and layout.
export function FestivalProductRow({ collection, limit = 6, layout = 'horizontal', buttonLabel }: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const cardWidth = horizontalProductCardWidth(viewportWidth);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { title, products, previewOnly, hasLocation, isLoading, isError, retry } = useFestivalCollection(collection, limit);
  const cards = products.map((product) => (
    <View key={product.id} className={layout === 'grid' ? 'px-1' : undefined} style={{ width: layout === 'grid' ? '33.333333%' : cardWidth }}>
      <GroceryProductTile product={product} previewOnly={previewOnly} />
      <FestivalProductDetails product={product} showAssortment={collection === 'festival-fruits'} showBoxOptions={collection === 'sweets-to-share'} />
    </View>
  ));
  return (
    <View className="pt-8">
      <SectionTitle>{title}</SectionTitle>
      {products.length > 0 ? (
        <>
          {layout === 'grid' ? (
            <View className="px-5">
              <View className="-mx-1 flex-row flex-wrap items-start gap-y-5">{cards}</View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: HORIZONTAL_PRODUCT_CARD_GAP, alignItems: 'flex-start' }} snapToInterval={cardWidth + HORIZONTAL_PRODUCT_CARD_GAP} snapToAlignment="start" decelerationRate="fast">
              {cards}
            </ScrollView>
          )}
          {buttonLabel && <View className="px-5">
            <SeeAllProductsButton products={products} sectionTitle={title} label={buttonLabel} avatarCount={2} onPress={() => navigation.navigate('FestivalCollection', { collection })} />
          </View>}
        </>
      ) : (
        <ContentState hasLocation={hasLocation} isLoading={isLoading} isError={isError} retry={retry} emptyMessage={collection === 'festival-offers' ? 'No festival offers listed yet.' : 'Not listed nearby yet.'} />
      )}
    </View>
  );
}
