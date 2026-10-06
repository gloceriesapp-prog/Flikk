import { Pressable, Text, View } from 'react-native';
import { useHomeSections } from '../../useHomeSections';
import { NAVRATRI_FESTIVAL } from '../data';
import { FestivalGreetingSection } from './FestivalGreetingSection';
import { FestivalScallopEdge } from './FestivalScallopEdge';
import { useFestivalGreeting } from './useFestivalGreeting';
import { useFestivalProducts } from './useFestivalProducts';

export function FestivalGreetingPanel() {
  const greeting = useFestivalGreeting();
  const { data: sectionConfig } = useHomeSections();
  // Retain existing admin visibility controls after moving the destination.
  const config = sectionConfig?.find((section) => section.key === 'festival-greeting');
  const visible = greeting.data?.isActive !== false && config?.enabled !== false;
  const products = useFestivalProducts(visible);
  const backgroundColor = NAVRATRI_FESTIVAL.backgroundColor;

  if (!visible) {
    return <Text className="px-5 py-10 text-center text-[14px] text-ink/60">No festival items available yet.</Text>;
  }

  return (
    <View style={{ marginTop: -2, backgroundColor }}>
      <FestivalGreetingSection
        products={products.data ?? []}
        title={greeting.data?.title}
        tagline={greeting.data?.tagline}
        categories={greeting.data?.categories}
      />
      {products.isError && <Pressable accessibilityRole="button" onPress={() => { void products.refetch(); }} className="min-h-11 items-center justify-center px-5 py-3"><Text className="text-[13px] font-semibold text-[#155DFC]">Couldn’t load festival products. Tap to retry.</Text></Pressable>}
      <FestivalScallopEdge color={backgroundColor} />
    </View>
  );
}
