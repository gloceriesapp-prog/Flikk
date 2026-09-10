// One "shelf" — a single nearby store's own real deal products, per an
// explicit ask/reference. Title names the actual store ("Popular in
// {store.name}") rather than a generic "Popular this week" repeated on
// every card, so it's clear which store an item would actually order
// from before tapping it (single-store-per-order, CLAUDE.md). Chevron
// navigates to that store's own StoreDetail screen, same as tapping the
// store elsewhere in this app.
//
// Falls back to DUMMY_POPULAR_PRODUCTS (dummyPopularProducts.ts) only
// while this store has zero real deals on file — TEMPORARY, purely so the
// 4-row layout can actually be seen at real size before any store has
// enough real discounted products; never overrides real data once a store
// has some. Delete this fallback once that's no longer true, same
// convention screens/home/most-bought/dummyPreviewProducts.ts already
// documents for its own sections.

import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useStorePopularProducts } from './useStorePopularProducts';
import { PopularProductRow } from './PopularProductRow';
import { DUMMY_POPULAR_PRODUCTS } from './dummyPopularProducts';
import type { AppStackParamList } from '../../../navigation/types';

const PANEL_WIDTH = 300;
// Same indigo family as StoreHeader.tsx/StoreFilterBar.tsx's own active
// state — this screen's one consistent accent, not a new color.
const ACCENT = '#4C5FE0';

interface Props {
  storeId: string;
  storeName: string;
}

export function PopularStorePanel({ storeId, storeName }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: realProducts = [] } = useStorePopularProducts(storeId);
  const products = realProducts.length > 0 ? realProducts : DUMMY_POPULAR_PRODUCTS;

  if (products.length === 0) return null;

  return (
    <View
      className="overflow-hidden rounded-[24px] border border-gray-100 bg-white py-4"
      style={{ width: PANEL_WIDTH }}
    >
      <Pressable
        onPress={() => navigation.navigate('StoreDetail', { storeId, storeName })}
        className="flex-row items-start justify-between gap-2 px-4 pb-3"
      >
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-semibold" numberOfLines={1} style={{ color: ACCENT }}>
            Popular in {storeName}
          </Text>
          <Text className="text-[12.5px] font-medium text-ink/50">Tap an item to add it to your order</Text>
        </View>
        <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-gray-100">
          <AppIcon icon={ArrowRight01Icon} size={14} color={colors.ink} strokeWidth={2} />
        </View>
      </Pressable>

      <View className="border-t border-gray-100">
        {products.map((product, index) => (
          <View key={product.id} className={index === products.length - 1 ? '' : 'border-b border-gray-50'}>
            <PopularProductRow product={product} />
          </View>
        ))}
      </View>
    </View>
  );
}
