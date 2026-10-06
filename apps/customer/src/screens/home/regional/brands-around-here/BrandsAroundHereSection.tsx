import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { DistrictBrandCard } from './DistrictBrandCard';
import { useDistrictBrands } from './useDistrictBrands';

export function BrandsAroundHereSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { brands, previewOnly, hasLocation, isLoading, isError, retry } = useDistrictBrands();
  const action = !hasLocation ? () => navigation.navigate('SelectLocation') : isError ? retry : undefined;
  return (
    <View className="pt-8">
      <SectionTitle>Brands from Around Here</SectionTitle>
      {brands.length > 0 ? (
        <View className="px-5">
          <View className="-mx-1.5 flex-row flex-wrap gap-y-3">
            {brands.map((brand) => <View key={brand.id} className="px-1.5" style={{ width: '33.333333%' }}><DistrictBrandCard brand={brand} previewOnly={previewOnly} /></View>)}
          </View>
        </View>
      ) : (
        <View className="mx-5 items-center gap-3 rounded-2xl border border-ink/10 px-5 py-6">
          {hasLocation && isLoading ? <BrowseLoadingText message={BROWSE_LOADING_COPY.regional} /> : (
            <>
              <Text className="text-center text-sm text-ink/60">{!hasLocation ? 'Choose your address to discover brands available nearby.' : isError ? 'We couldn’t load district brands. Please try again.' : 'No verified district brands with available products nearby yet.'}</Text>
              {action && <Pressable accessibilityRole="button" onPress={action} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5"><Text className="font-semibold text-white">{!hasLocation ? 'Choose location' : 'Try again'}</Text></Pressable>}
            </>
          )}
        </View>
      )}
    </View>
  );
}
