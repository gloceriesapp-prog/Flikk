import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { CategoryDetailHeader } from '../../../category-detail/components/CategoryDetailHeader';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { BrandFooter } from '../../../../components/BrandFooter';
import { RegionalSectionState } from '../components/RegionalSectionState';
import { useCoconutOilProducts } from './useCoconutOilProducts';

type Props = NativeStackScreenProps<AppStackParamList, 'CoconutOilCollection'>;

export function CoconutOilScreen({ navigation }: Props) {
  const oil = useCoconutOilProducts();
  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader title="Rooted in Our Coast" onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />
      <FlashList data={oil.products} numColumns={2} keyExtractor={(product) => product.id} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }} renderItem={({ item }) => <View className="flex-1 px-1 pb-6"><GroceryProductTile product={item} previewOnly={oil.previewOnly} />{item.brandOrigin && <Text className="mt-2 text-[11px] font-semibold text-[#587047]">From {item.brandOrigin}</Text>}</View>} ListFooterComponent={<>{oil.previewOnly && (!oil.hasLocation || oil.isError) && <RegionalSectionState {...oil} loadingLabel="Loading coconut oils" emptyMessage="No coconut oils available nearby yet." />}<BrandFooter /></>} />
    </View>
  );
}
