import { useCallback, useEffect, useState } from 'react';
import { useCollectionCategories } from './useCollectionCategories';
import { CategoryDetailContent } from '../../category-detail/CategoryDetailScreen';
import { catalogueParent, filterCollectionCategory } from './collectionSidebar';
import { categoryTileProducts } from './categoryTileProducts';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { ScreenStatusBar as StatusBar } from '../../../components/ScreenStatusBar';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { useCollectionBottomPadding } from '../../../navigation/home/useCollectionBottomPadding';
import { CategoryDetailHeader } from '../../category-detail/components/CategoryDetailHeader';
import { SubCategorySidebarItem } from '../../category-detail/components/SubCategorySidebarItem';
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
  const paddingBottom = useCollectionBottomPadding();
  const [selectedId, setSelectedId] = useState(itemId);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
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
  const products = categoryProducts.map(mapContentProduct);
  const { fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isFetchNextPageError } = inventory;
  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetching || isFetchNextPageError) return;
    void fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage, hasNextPage, isFetching, isFetchNextPageError]);
  const parentCategoryId = isCatalogueTile ? catalogueParent(scopedCategories) : undefined;
  useEffect(() => {
    // An empty page has nothing to scroll. Keep looking until items appear or
    // the last store cursor is exhausted.
    if (!parentCategoryId && products.length === 0) loadMore();
  }, [loadMore, parentCategoryId, products.length]);
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
  const showSidebar = accessible && !isProductCollection && sidebarItems.length > 0;
  const columns = showSidebar ? 2 : 3;
  if (parentCategoryId) {
    return <CategoryDetailContent
      key={parentCategoryId}
      categoryId={parentCategoryId}
      label={title}
      showFilters={false}
      productBottomPadding={paddingBottom}
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
        {showSidebar && (
          <View className="w-[86px] border-r border-ink/5">
            <FlatList
              data={sidebarItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 12, paddingBottom, gap: 24 }}
              renderItem={({ item }) => (
                <SubCategorySidebarItem
                  subCategory={{ id: item.id, label: item.title, imageUrl: item.imageUrl }}
                  isSelected={item.id === (isCatalogueTile ? selectedCategoryId : selectedId)}
                  onPress={() => {
                    if (isCatalogueTile) setSelectedCategoryId(item.id);
                    else setSelectedId(item.id);
                  }}
                />
              )}
            />
          </View>
        )}
        <View className="min-w-0 flex-1 overflow-hidden">
          {isCatalogueTile && categoryQuery.isPending && raw.length > 0 ? (
            <ContentState hasLocation={inventory.hasLocation} isLoading isError={false} retry={inventory.retry} emptyMessage="" />
          ) : products.length > 0 || hasNextPage ? (
            <FlashList
              key={columns}
              data={products}
              numColumns={columns}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator accessibilityLabel="Loading more products" color="#155DFC" className="py-4" />
                ) : isFetchNextPageError ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isFetching}
                    onPress={() => { void fetchNextPage({ cancelRefetch: false }); }}
                    className="items-center py-4"
                  >
                    <Text className="font-semibold text-[#155DFC]">Retry loading more</Text>
                  </Pressable>
                ) : null
              }
              keyExtractor={(product) => product.id}
              contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom }}
              renderItem={({ item }) => (
                <View className="w-full px-1 pb-6">
                  <GroceryProductTile product={item} previewOnly={false} />
                </View>
              )}
            />
          ) : (
            <View className="flex-1 justify-center py-6">
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
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
