import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { LocalBrandCard } from './LocalBrandCard';
import { useLocalPantryBrands } from './useLocalPantryBrands';

export function LocalBrandsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { brands, previewOnly, hasLocation, isLoading, isError, retry } = useLocalPantryBrands();

  return (
    <View className="pt-8">
      <SectionTitle>Local Pantry Brands</SectionTitle>
      {brands.length > 0 ? (
        <View className="flex-row gap-3 px-5">
          {brands.slice(0, 3).map((brand) => <LocalBrandCard key={brand.id} brand={brand} previewOnly={previewOnly} onPress={() => navigation.navigate('LocalPantryBrand', { brandId: brand.id })} />)}
          {Array.from({ length: Math.max(0, 3 - brands.length) }, (_, index) => <View key={`space-${index}`} className="flex-1" />)}
        </View>
      ) : (
        <View className="mx-5 items-center gap-3 rounded-2xl bg-mist/50 px-5 py-6">
          {!hasLocation ? (
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SelectLocation')} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5"><Text className="font-semibold text-white">Choose location</Text></Pressable>
          ) : isLoading ? <ActivityIndicator accessibilityLabel="Loading local pantry brands" color="#155DFC" /> : isError ? (
            <Pressable accessibilityRole="button" onPress={retry} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5"><Text className="font-semibold text-white">Try again</Text></Pressable>
          ) : <Text className="text-center text-sm text-ink/60">No verified local pantry brands available at this address yet.</Text>}
        </View>
      )}
    </View>
  );
}
