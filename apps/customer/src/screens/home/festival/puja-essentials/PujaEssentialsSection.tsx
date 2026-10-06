import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { ContentState } from '../../content/ContentState';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { SeeAllProductsButton } from '../../groceries/components/SeeAllProductsButton';
import { usePujaEssentials } from './usePujaEssentials';

interface Props {
  title?: string;
}

export function PujaEssentialsSection({ title = 'Puja essentials' }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { products, previewOnly, hasLocation, isLoading, isError, retry } = usePujaEssentials();

  return (
    <View className="pt-8">
      <SectionTitle>{title}</SectionTitle>
      {products.length > 0 ? (
        <View className="px-5">
          <View className="-mx-1 flex-row flex-wrap items-start gap-y-5">
            {products.map((product) => (
              <View key={product.id} className="px-1" style={{ width: '33.333333%' }}>
                <GroceryProductTile product={product} previewOnly={previewOnly} />
                {product.storeName && (
                  <Text numberOfLines={1} className="mt-1.5 text-[11px] font-medium text-ink/55">
                    {product.storeName}
                  </Text>
                )}
              </View>
            ))}
          </View>
          <SeeAllProductsButton products={products} sectionTitle={title} label="Explore puja essentials" avatarCount={2} onPress={() => navigation.navigate('FestivalCollection', { collection: 'puja-essentials' })} />
        </View>
      ) : (
        <ContentState
          hasLocation={hasLocation}
          isLoading={isLoading}
          isError={isError}
          retry={retry}
          emptyMessage="Not listed nearby yet."
        />
      )}
    </View>
  );
}
