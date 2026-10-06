import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { RegionalCategoryTile } from './RegionalCategoryTile';
import { useRegionalCategories } from './useRegionalCategories';

export function ShopByCategorySection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { categories, hasLocation, isLoading, isError, retry } = useRegionalCategories();
  return (
    <View className="pt-6">
      <SectionTitle>Shop by Category</SectionTitle>
      <View className="px-5">
        <View className="-mx-1.5 flex-row flex-wrap gap-y-4">
          {categories.map(({ category, imageUrl }) => (
            <View key={category.id} className="px-1.5" style={{ width: '33.333333%' }}>
              <RegionalCategoryTile category={category} imageUrl={imageUrl} onPress={() => hasLocation ? navigation.navigate('RegionalCategory', { categoryId: category.id }) : navigation.navigate('SelectLocation')} />
            </View>
          ))}
        </View>
      </View>
      {!hasLocation ? (
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="mx-5 mt-4 min-h-12 items-center justify-center rounded-2xl bg-[#F3F5EF] px-4 py-3">
          <Text className="text-center text-[13px] font-semibold text-[#435B39]">Choose your address to explore nearby stock</Text>
        </Pressable>
      ) : isLoading ? (
        <View className="mt-4 flex-row items-center justify-center gap-2 px-5"><BrowseLoadingText message={BROWSE_LOADING_COPY.regional} /></View>
      ) : isError ? (
        <Pressable accessibilityRole="button" onPress={retry} className="mx-5 mt-4 min-h-12 items-center justify-center rounded-2xl bg-[#F3F5EF] px-4 py-3"><Text className="text-center text-[13px] font-semibold text-[#435B39]">Couldn’t load nearby stock · Try again</Text></Pressable>
      ) : null}
    </View>
  );
}
