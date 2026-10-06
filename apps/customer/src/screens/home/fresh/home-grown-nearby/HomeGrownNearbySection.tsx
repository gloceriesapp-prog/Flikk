import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { AppImage as Image } from '../../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { AppStackParamList } from '../../../../navigation/types';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { FreshSectionState } from '../components/FreshSectionState';
import { HomeGrownBackground } from './HomeGrownBackground';
import { HomeGrownHeaderImage } from './HomeGrownHeaderImage';
import { useHomeGrowers } from './useHomeGrowers';

export function HomeGrownNearbySection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const nearby = useHomeGrowers();
  const products = [...new Map(nearby.growers.flatMap((grower) => grower.products).map((product) => [product.id, product])).values()].slice(0, 4);
  return (
    <View className="relative mt-8 overflow-hidden bg-[#E2E9CE] pb-6">
      <HomeGrownBackground />
      <View className="relative mb-2 min-h-[104px] items-end">
        <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} className="absolute left-0 right-0 top-0 z-10 px-6 pt-5 text-[26px] font-bold leading-[32px] tracking-[-0.8px] text-[#34452A]">
          Your Neighbourhood{'\n'}Harvest
        </Text>
        <HomeGrownHeaderImage />
      </View>
      {products.length > 0 ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5" snapToInterval={140} snapToAlignment="start" decelerationRate="fast">
            {products.map((product) => <View key={product.id} className="w-32"><GroceryProductTile product={product} previewOnly={nearby.previewOnly} /></View>)}
          </ScrollView>
        </View>
      ) : <FreshSectionState {...nearby} emptyMessage="No verified home growers with available produce nearby yet." />}
      <Pressable accessibilityRole="button" accessibilityLabel="Explore home-grown produce nearby" onPress={() => navigation.navigate('HomeGrownProduce')} className="mx-5 mt-6 min-h-[48px] flex-row items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-4 py-2 active:bg-white">
        {products.length > 0 && (
          <View className="flex-row items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {products.slice(0, 2).map((product, index) => (
              <View key={product.id} className="h-8 w-8 overflow-hidden rounded-full border border-[#D0DABE] bg-white" style={{ marginLeft: index === 0 ? 0 : -10, zIndex: index + 1 }}>
                <Image source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="contain" />
              </View>
            ))}
          </View>
        )}
        <View className="flex-shrink flex-row items-center gap-2">
          <Text className="flex-shrink text-center text-[15px] font-semibold text-[#34452A]">Explore local produce</Text>
          <AppIcon icon={ArrowRight01Icon} size={19} color="#34452A" strokeWidth={2} />
        </View>
      </Pressable>
    </View>
  );
}
