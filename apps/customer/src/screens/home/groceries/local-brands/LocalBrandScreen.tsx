import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { CategoryDetailHeader } from '../../../category-detail/components/CategoryDetailHeader';
import { GroceryProductTile } from '../components/GroceryProductTile';
import { KITCHEN_PREVIEW_PRODUCTS } from '../kitchen-essentials/previewProducts';
import { useLocalPantryBrands } from './useLocalPantryBrands';

type Props = NativeStackScreenProps<AppStackParamList, 'LocalPantryBrand'>;

export function LocalBrandScreen({ navigation, route }: Props) {
  const { brands, previewOnly, hasLocation, isLoading, isError, retry } = useLocalPantryBrands();
  const brand = brands.find((item) => item.id === route.params.brandId);

  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader title={brand?.name ?? 'Local pantry brand'} onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />
      {brand ? (
        <ScrollView contentContainerClassName="px-5 pb-10 pt-3">
          <View className="overflow-hidden rounded-[28px] p-6" style={{ backgroundColor: brand.tint }}>
            <Text className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{previewOnly ? 'Concept brand · Design preview' : 'Verified local pantry brand'}</Text>
            <View className="mt-5 h-20 w-20 items-center justify-center rounded-full bg-white/75"><Text className="text-[28px] font-bold" style={{ color: brand.accent }}>{brand.monogram}</Text></View>
            <Text className="mt-4 text-[28px] font-bold tracking-tight text-ink">{brand.name}</Text>
            <Text className="mt-1 text-sm font-semibold" style={{ color: brand.accent }}>{brand.category}</Text>
            <Text className="mt-4 text-sm leading-6 text-ink/65">{brand.story}</Text>
            <Text className="mt-3 text-xs text-ink/50">{brand.origin}</Text>
          </View>
          <Text className="mb-4 mt-7 text-[18px] font-bold text-ink">{previewOnly ? 'A taste of the layout' : 'Shop this brand'}</Text>
          {previewOnly && <Text className="mb-4 text-xs leading-5 text-ink/50">These sample products demonstrate the layout. They are not products from this concept brand and cannot be purchased.</Text>}
          <View className="-mx-1 flex-row flex-wrap gap-y-5">
            {(previewOnly ? KITCHEN_PREVIEW_PRODUCTS : brand.products).map((product) => (
              <View key={product.id} className="w-1/2 px-1"><GroceryProductTile product={product} previewOnly={previewOnly} /></View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          {!hasLocation ? <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5"><Text className="font-semibold text-white">Choose location</Text></Pressable> : isLoading ? <ActivityIndicator color="#155DFC" accessibilityLabel="Loading brand products" /> : isError ? <Pressable accessibilityRole="button" onPress={retry} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5"><Text className="font-semibold text-white">Try again</Text></Pressable> : <Text className="text-center text-sm text-ink/60">This brand has no available pantry products at your address right now.</Text>}
        </View>
      )}
    </View>
  );
}
