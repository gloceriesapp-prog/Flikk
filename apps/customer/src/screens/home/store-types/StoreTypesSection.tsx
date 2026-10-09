// "Shop by Store Type" — Home's "All" tab, second section (after
// NearbyStoresSection). Every distinct category among real active stores
// (useStoreTypes.ts -> GET /stores), grouped client-side — not the product-
// frequency tabs above (CategoryTabs), this is store-type browse: Hardware,
// Paint Shop, Steel & Vessels etc, the occasional-purchase store types that
// don't belong scanned in the same fast row as Groceries/Bakery. Renders
// nothing while there are no categorized stores yet, same convention as
// every other Home section on this screen.
//
// "Your Favorites" is a separate, first chip — NOT a synthetic entry
// mixed into storeTypes (that array is real backend data, useStoreTypes.ts's
// own note; a fake category in it would silently break anything that reads
// storeType.storeCount as real). Coral-tinted, not the lime/limeSoft every
// real store-type chip uses, so it reads as a shortcut, not another
// category. No onPress yet — this app has no favorites/wishlist screen
// built (CartItemRow's own note on why there's no "move to wishlist" link
// either), same "UI exists, flow not wired" convention as ProductCardView's
// bookmark heart.

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bookmark01Icon, HeartIcon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useStoreTypes } from './useStoreTypes';
import { StoreTypeCard } from './StoreTypeCard';
import type { AppStackParamList } from '../../../navigation/types';

export function StoreTypesSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: storeTypes = [] } = useStoreTypes();

  if (storeTypes.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="mb-4 px-5 text-[17px] font-bold text-ink/90">Shop by Store Type</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        <Pressable className="flex-row items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5">
          <AppIcon icon={Bookmark01Icon} size={18} color={colors.primary} fill={colors.primary} />
          <Text className="text-[13px] font-semibold text-ink" numberOfLines={1}>
            Wishlist
          </Text>
        </Pressable>

        {storeTypes.map((storeType) => (
          <StoreTypeCard key={storeType.category} storeType={storeType} onPress={() => navigation.navigate('Store')} />
        ))}
      </ScrollView>
    </View>
  );
}
