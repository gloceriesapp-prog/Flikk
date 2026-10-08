import { Pressable, Text, View } from 'react-native';
import { useHomeSections } from '../../useHomeSections';
import type { FestivalTabConfig } from '../data';
import { useFestivalSection } from '../picks/useFestivalSection';
import { FestivalGreetingSection } from './FestivalGreetingSection';
import { FestivalScallopEdge } from './FestivalScallopEdge';
import { useFestivalGreeting } from './useFestivalGreeting';
import { useFestivalProducts } from './useFestivalProducts';

export function FestivalGreetingPanel({ festival }: { festival: FestivalTabConfig }) {
  const greeting = useFestivalGreeting();
  const { data: sectionConfig } = useHomeSections();
  // Retain existing admin visibility controls after moving the destination.
  const config = sectionConfig?.find((section) => section.key === 'festival-greeting');
  const visible = greeting.data?.isActive !== false && config?.enabled !== false;
  // Admin Festival Section products lead the rail; the zone catalogue only
  // fills it when the admin picked none.
  const adminSection = useFestivalSection();
  const adminProducts = adminSection.data?.products ?? [];
  const products = useFestivalProducts(visible && !adminSection.isPending && adminProducts.length === 0);
  const railProducts = adminProducts.length > 0 ? adminProducts : products.data ?? [];
  const backgroundColor = festival.backgroundColor;

  if (!visible) {
    return <Text className="px-5 py-10 text-center text-[14px] text-ink/60">No festival items available yet.</Text>;
  }

  return (
    <View style={{ marginTop: -2, backgroundColor }}>
      <FestivalGreetingSection
        products={railProducts}
        title={greeting.data?.title}
        tagline={greeting.data?.tagline}
        categories={greeting.data?.categories}
        bannerUri={festival.bannerImageUri}
        festivalTitle={festival.title}
      />
      {adminProducts.length === 0 && products.isError && <Pressable accessibilityRole="button" onPress={() => { void products.refetch(); }} className="min-h-11 items-center justify-center px-5 py-3"><Text className="text-[13px] font-semibold text-[#155DFC]">Couldn’t load festival products. Tap to retry.</Text></Pressable>}
      <FestivalScallopEdge color={backgroundColor} />
    </View>
  );
}
