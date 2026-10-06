import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { AppImage as Image } from '../../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../../theme/placeholderImage';
import type { AppStackParamList } from '../../../../navigation/types';
import { GroceryProductTile } from '../../groceries/components/GroceryProductTile';
import { RegionalSectionState } from '../components/RegionalSectionState';
import { CoconutOilHeaderImage } from './CoconutOilHeaderImage';
import { useCoconutOilProducts } from './useCoconutOilProducts';

export function CoconutOilSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const oil = useCoconutOilProducts();
  const products = oil.products.slice(0, 4);
  return (
    <View className="relative mt-8 overflow-hidden bg-[#F3EBD9] pb-6">
      <View className="relative mb-2 min-h-[104px] items-end">
        <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} className="absolute left-0 right-0 top-0 z-10 px-6 pt-5 text-[26px] font-bold leading-[32px] tracking-[-0.8px] text-[#505044]">
          Rooted in Our{'\n'}Coast
        </Text>
        <CoconutOilHeaderImage />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-start gap-3 px-5" snapToInterval={140} snapToAlignment="start" decelerationRate="fast">
        {products.map((product) => (
          <View key={product.id} className="w-32">
            <GroceryProductTile product={product} previewOnly={oil.previewOnly} />
            {product.brandOrigin && <Text numberOfLines={2} className="mt-2 rounded-lg bg-[#EDF4E8] px-2 py-1.5 text-[10px] font-semibold leading-[14px] text-[#587047]">From {product.brandOrigin}</Text>}
          </View>
        ))}
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('CoconutOilCollection')} className="mx-5 mt-6 min-h-[48px] flex-row items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-4 py-2 active:bg-white">
        <View className="flex-row items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {products.slice(0, 2).map((product, index) => (
            <View key={product.id} className="h-8 w-8 overflow-hidden rounded-full border border-[#E3DDCD] bg-white" style={{ marginLeft: index === 0 ? 0 : -10, zIndex: index + 1 }}>
              <Image source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="contain" />
            </View>
          ))}
        </View>
        <View className="flex-shrink flex-row items-center gap-2">
          <Text className="flex-shrink text-center text-[15px] font-semibold text-[#4B422D]">Explore coconut oils</Text>
          <AppIcon icon={ArrowRight01Icon} size={19} color="#4B422D" strokeWidth={2} />
        </View>
      </Pressable>
      {oil.previewOnly && (!oil.hasLocation || oil.isError) && <View className="mt-4"><RegionalSectionState {...oil} loadingLabel="Loading coconut oils" emptyMessage="No edible coconut oils available nearby yet." /></View>}
    </View>
  );
}
