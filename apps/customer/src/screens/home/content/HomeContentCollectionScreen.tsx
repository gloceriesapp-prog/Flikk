import { useState } from 'react';
import { useCollectionCategories } from './useCollectionCategories';
import { CategoryDetailContent } from '../../category-detail/CategoryDetailScreen';
import { catalogueParent, filterCollectionCategory } from './collectionSidebar';
import { categoryTileProducts } from './categoryTileProducts';
import { FlatList, Pressable, Text, View } from 'react-native';
import { ScreenStatusBar as StatusBar } from '../../../components/ScreenStatusBar';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { CategoryDetailHeader } from '../../category-detail/components/CategoryDetailHeader';
import { SubCategorySidebarItem } from '../../category-detail/components/SubCategorySidebarItem';
import { CategoryFilterBar } from '../../category-detail/filters/CategoryFilterBar';
import { CategoryFilterSheet } from '../../category-detail/filters/CategoryFilterSheet';
import {
  DEFAULT_FILTERS,
  filterProducts,
  getTypeOptions,
  type FilterPanel,
  type ProductFilters,
} from '../../category-detail/filters/productFilters';
import { GroceryProductTile } from '../groceries/components/GroceryProductTile';
import { useCollectionInventory } from './useCollectionInventory';
import { selectContentProducts } from './contracts';
import { useHomeContent } from './useHomeContent';
import { mapContentProduct } from './productMapping';
import { ContentState } from './ContentState';

type Props = NativeStackScreenProps<AppStackParamList, 'HomeContentCollection'>;
export function HomeContentCollectionScreen(props: Props) {
  const { tabKey, sectionId, itemId } = props.route.params;
  return <CollectionContent key={`${tabKey}:${sectionId}:${itemId ?? 'all'}`} {...props} />;
}
function CollectionContent({ route, navigation }: Props) {
  const { tabKey, sectionId, itemId } = route.params;
  const query = useHomeContent();
  const [selectedId, setSelectedId] = useState(itemId);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
  const [panel, setPanel] = useState<FilterPanel | null>(null);
  const content = query.data?.find((row) => row.tabKey === tabKey)?.content;
  const section = content?.enabled
    ? content.sections.find((s) => s.id === sectionId && s.enabled)
    : undefined;
  const items = section?.items.filter((item) => item.enabled) ?? [];
  const selected = items.find((item) => item.id === selectedId);
  const accessible = Boolean(section && (!itemId || selected));
  const inventory = useCollectionInventory(tabKey, sectionId, selected?.id, accessible);
  const collectionProducts =
    items.length && !selected
      ? [
          ...new Map(
            items
              .flatMap((item) => selectContentProducts(inventory.visibleProducts, item.selection))
              .map((product) => [product.id, product]),
          ).values(),
        ]
      : inventory.visibleProducts;
  const raw =
    section && accessible
      ? section.kind === 'categories' ? categoryTileProducts(collectionProducts, selected ? [selected] : items) : selectContentProducts(collectionProducts, selected?.selection ?? section.selection)
      : [];
  const isCategoryTile = section?.kind === 'categories' && Boolean(itemId);
  const isCatalogueTile = isCategoryTile && selected?.selection.mode === 'automatic';
  const isProductCollection = isCategoryTile && selected?.selection.mode === 'manual';
  const categoryQuery = useCollectionCategories(isCatalogueTile ? raw : [], selected?.selection.categoryIds ?? []);
  const scopedCategories = categoryQuery.data ?? [];
  const categoryProducts = isCatalogueTile ? filterCollectionCategory(raw, selectedCategoryId) : raw;
  const baseProducts = categoryProducts.map(mapContentProduct);
  const brands =
    content?.sections
      .filter((s) => s.enabled && s.kind === 'brands')
      .flatMap((s) =>
        s.items
          .filter((item) => item.enabled)
          .map((item) => ({
            id: item.id,
            name: item.title,
            productIds: selectContentProducts(inventory.visibleProducts, item.selection).map(
              (product) => product.id,
            ),
          })),
      ) ?? [];
  const products = filterProducts(baseProducts, filters, brands);
  const title = selected?.title || section?.title || content?.tabTitle || 'Products';
  const unavailable = !query.isPending && !query.isError && !accessible;
  const displayItems = items.map((item) => ({
    ...item,
    imageUrl:
      item.imageUrl ||
      selectContentProducts(inventory.visibleProducts, item.selection).find(
        (product) => product.image_url,
      )?.image_url ||
      undefined,
  }));
  const sidebarItems = isCatalogueTile
    ? [{ id: 'all', title: selected?.title ?? 'All', imageUrl: selected?.imageUrl }, ...scopedCategories.map(category => ({ id: category.id, title: category.label, imageUrl: category.imageUrl }))]
    : displayItems;
  const parentCategoryId = isCatalogueTile ? catalogueParent(scopedCategories) : undefined;
  if (parentCategoryId) {
    return <CategoryDetailContent
      key={parentCategoryId}
      categoryId={parentCategoryId}
      label={title}
      onBack={() => navigation.goBack()}
      onSearch={() => navigation.navigate('Search')}
    />;
  }
  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader
        title={title.replaceAll('\n', ' ')}
        onBack={() => navigation.goBack()}
        onSearch={() => navigation.navigate('Search')}
      />
      <View className="min-h-0 flex-1 flex-row">
        {accessible && !isProductCollection && items.length > 0 && (
          <View className="w-[86px] border-r border-ink/5">
            <FlatList
              data={sidebarItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, gap: 24 }}
              renderItem={({ item }) => (
                <SubCategorySidebarItem
                  subCategory={{ id: item.id, label: item.title, imageUrl: item.imageUrl }}
                  isSelected={item.id === (isCatalogueTile ? selectedCategoryId : selectedId)}
                  onPress={() => {
                    if (isCatalogueTile) setSelectedCategoryId(item.id);
                    else setSelectedId(item.id);
                    setFilters({ ...DEFAULT_FILTERS });
                  }}
                />
              )}
            />
          </View>
        )}
        <View className="min-w-0 flex-1 overflow-hidden">
          {accessible && <CategoryFilterBar filters={filters} onOpen={setPanel} />}
          {isCatalogueTile && categoryQuery.isPending && raw.length > 0 ? (
            <ContentState hasLocation={inventory.hasLocation} isLoading isError={false} retry={inventory.retry} emptyMessage="" />
          ) : products.length ? (
            <FlashList
              key={isProductCollection ? 'custom-products' : 'catalogue-products'}
              data={products}
              numColumns={isProductCollection ? 3 : 2}
              ListFooterComponent={inventory.hasNextPage ? (
                <Pressable accessibilityRole="button" disabled={inventory.isFetchingNextPage} onPress={() => { void inventory.fetchNextPage(); }} className="items-center py-4">
                  <Text className="font-semibold text-[#155DFC]">{inventory.isFetchingNextPage ? 'Loading…' : inventory.isFetchNextPageError ? 'Retry loading more' : 'Load more products'}</Text>
                </Pressable>
              ) : null}
              keyExtractor={(product) => product.id}
              contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: 48 }}
              renderItem={({ item }) => (
                <View className="px-1 pb-6" style={isProductCollection ? { width: '33.333333%' } : { flex: 1 }}>
                  <GroceryProductTile product={item} previewOnly={false} />
                </View>
              )}
            />
          ) : inventory.hasNextPage ? (
            <View className="items-center py-6">
              <Text className="text-center text-sm text-ink/60">No matches in the loaded products.</Text>
              <Pressable accessibilityRole="button" disabled={inventory.isFetchingNextPage} onPress={() => { void inventory.fetchNextPage(); }} className="items-center py-4">
                <Text className="font-semibold text-[#155DFC]">{inventory.isFetchingNextPage ? 'Loading…' : 'Load more products'}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-1 justify-center py-6">
              {baseProducts.length ? (
                <View className="items-center gap-3 px-5">
                  <Text className="text-center text-sm text-ink/60">
                    No products match these filters.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFilters({ ...DEFAULT_FILTERS })}
                    className="min-h-11 justify-center px-4"
                  >
                    <Text className="font-semibold text-[#155DFC]">Reset filters</Text>
                  </Pressable>
                </View>
              ) : (
                <ContentState
                  hasLocation={unavailable ? true : inventory.hasLocation}
                  isLoading={query.isPending || inventory.isLoading}
                  isError={query.isError || inventory.isError}
                  retry={() => {
                    void query.refetch();
                    inventory.retry();
                  }}
                  emptyMessage={
                    unavailable
                      ? 'This collection is no longer available.'
                      : 'No available products in this collection nearby right now.'
                  }
                />
              )}
            </View>
          )}
        </View>
      </View>
      <CategoryFilterSheet
        panel={panel}
        filters={filters}
        types={getTypeOptions(baseProducts)}
        brands={brands.filter((brand) =>
          brand.productIds.some((id) => raw.some((product) => product.id === id)),
        )}
        onChange={setFilters}
        onClose={() => setPanel(null)}
      />
    </View>
  );
}
