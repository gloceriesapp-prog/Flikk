// Generic body for any admin-managed Home tab (Bakery, Protein, Meat & Fish
// and every tab without a dedicated template). Everything is admin data from
// GET /home-tabs — no hardcoded category ids:
//   - tiles: a tile linked to a category/subcategory in admin's Home
//     Categories screen opens CategoryDetail for that real category;
//     unlinked tiles are display-only.
//   - products: the generic category browse (GET /browse/category) for the
//     tab's linked category — the single category every linked tile shares,
//     otherwise the first linked tile's own target.
//   - every poster banner (HomeTabExtras, also used by managed tabs).
// Shows a real empty state when the tab has no linked category or the
// category truly has no products near the pin.

import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppImage as Image } from '../../../components/AppImage';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { PosterBanner } from '../category-tab/components/PosterBanner';
import { ProductCard } from '../products/ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { useCategoryProducts, useSubCategoryProducts } from '../../category-detail/useRealCategoryDetail';
import { useCopy } from '../../../api/appConfig';
import type { HomeTabTileLink, RemoteHomeTab, RemoteHomeTabTile } from '../data/useHomeTabs';
import type { AppStackParamList } from '../../../navigation/types';

interface Props {
  tab: RemoteHomeTab;
  // Festival renders its own product sections above the tiles.
  showProducts?: boolean;
}

// Exactly 4 columns, guaranteed — each cell is a true 25% width (see
// the old SubCategoryGrid note, same bug/fix).
const GAP = 12;

export function tabBrowseTarget(tiles: RemoteHomeTabTile[]): HomeTabTileLink | undefined {
  const links = tiles.flatMap((t) => (t.link ? [t.link] : []));
  if (links.length === 0) return undefined;
  const parents = new Set(links.map((l) => l.categoryId));
  return parents.size === 1 ? { type: 'category', id: links[0]!.categoryId, categoryId: links[0]!.categoryId } : links[0];
}

function TabProducts({ target }: { target?: HomeTabTileLink }) {
  const title = useCopy('home.categoryTab.products.title');
  const emptyTitle = useCopy('home.categoryTab.empty.title');
  const emptySubtitle = useCopy('home.categoryTab.empty.subtitle');
  const byCategory = useCategoryProducts(target?.type === 'category' ? target.id : '');
  const bySub = useSubCategoryProducts(target?.type === 'subcategory' ? target.id : undefined);
  const query = target?.type === 'subcategory' ? bySub : byCategory;
  const products = query.data?.pages.flatMap((p) => p.products) ?? [];

  if (target && query.isPending && query.fetchStatus !== 'idle') {
    return <Text className="px-5 py-10 text-center text-sm text-ink/50">Loading products…</Text>;
  }
  if (products.length === 0) {
    return (
      <View className="items-center gap-2 px-6 py-12">
        <Text className="text-center text-base font-semibold text-ink">{query.isError ? 'Couldn’t load products.' : emptyTitle}</Text>
        {query.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()}><Text className="font-semibold text-[#155DFC]">Try again</Text></Pressable>
        ) : <Text className="text-center text-sm text-ink/50">{emptySubtitle}</Text>}
      </View>
    );
  }
  return (
    <View className="pt-6">
      <SectionTitle>{title}</SectionTitle>
      <View className="flex-row flex-wrap gap-x-2.5 gap-y-5 px-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName="w-[31%]" showDiscountBadge />
        ))}
      </View>
      {query.hasNextPage && (
        <Pressable accessibilityRole="button" disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} className="items-center py-4">
          <Text className="font-semibold text-[#155DFC]">{query.isFetchingNextPage ? 'Loading…' : 'Load more products'}</Text>
        </Pressable>
      )}
    </View>
  );
}

// Admin tiles + every "Ads & posters" banner for a tab. Shared by the
// generic tab body and the managed Groceries/Fresh/Regional/Bakery tabs, so
// tiles and banners set in Home Categories show on every tab.
export function HomeTabExtras({ tab }: { tab: RemoteHomeTab }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  if (tab.tiles.length === 0 && tab.banners.length === 0) return null;

  return (
    <View>
      {tab.tiles.length > 0 && (
        <View className="px-5 pt-6">
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -GAP / 2 }}>
            {tab.tiles.map((tile) => (
              <Pressable
                key={tile.id}
                disabled={!tile.link}
                accessibilityRole={tile.link ? 'button' : undefined}
                onPress={() => tile.link && navigation.navigate('CategoryDetail', { categoryId: tile.link.categoryId, label: tile.name })}
                style={{ width: '25%', paddingHorizontal: GAP / 2, paddingBottom: 20 }}
              >
                <View
                  className="aspect-square items-center justify-center overflow-hidden rounded-2xl border border-gray-100 shadow-md shadow-black/20"
                  style={{ backgroundColor: '#EDEDF0' }}
                >
                  <Image source={{ uri: tile.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
                </View>
                <Text className="text-center text-sm font-medium leading-4 text-ink" numberOfLines={2}>
                  {tile.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {tab.banners.map((banner) => <PosterBanner key={banner.id} imageUri={banner.imageUrl} />)}
    </View>
  );
}

export function HomeTabTileGrid({ tab, showProducts = true }: Props) {
  return (
    <View className="pb-32">
      <HomeTabExtras tab={tab} />
      {showProducts && <TabProducts target={tabBrowseTarget(tab.tiles)} />}
    </View>
  );
}
