import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { fetchSelectedPopularBrands } from '../../../api/brands';
import { PopularBrandTiles } from '../../../components/PopularBrands/PopularBrandTiles';
import type { AppStackParamList } from '../../../navigation/types';
import { HomeSectionButton } from '../components/HomeSectionButton';
import { SectionTitle } from '../components/SectionTitle';
import type { HomeContentKey, HomeContentSection } from './contracts';

export function ContentPopularBrands({ section, tabKey }: {
  section: HomeContentSection;
  tabKey: HomeContentKey;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const ids = section.items.flatMap(item =>
    item.enabled && /^brand-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(item.id) ? [item.id.slice(6)] : [],
  );
  const { data } = useQuery({
    queryKey: ['popular-brands', 'category-preview', ids],
    queryFn: ({ signal }) => fetchSelectedPopularBrands(ids, signal),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
  const brands = data?.slice(0, 4) ?? [];
  const isUdupi = tabKey === 'regional';

  if (!brands.length) return null;

  return (
    <View className={isUdupi ? 'bg-white pt-8' : 'pt-8'}
      style={isUdupi ? undefined : { backgroundColor: section.backgroundColor || undefined }}>
      <SectionTitle subtitle={section.subtitle}>{section.title || 'Popular Brands'}</SectionTitle>
      <PopularBrandTiles brands={brands} columns={isUdupi ? 4 : 5}
        onSelect={brand => navigation.navigate('BrandProducts', { brand })} />
      <HomeSectionButton label="Explore more"
        onPress={() => navigation.navigate('AllBrands')} />
    </View>
  );
}
