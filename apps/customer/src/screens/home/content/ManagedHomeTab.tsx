import { ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { SectionTitle } from '../components/SectionTitle';
import { SeeAllProductsButton } from '../groceries/components/SeeAllProductsButton';
import { GroceryStorePreviewCard } from '../groceries/shops-you-know/GroceryStorePreviewCard';
import { RegionalShopCard } from '../regional/nearby-shops/RegionalShopCard';
import { useNearbyGroceryInventory } from '../groceries/useNearbyGroceryInventory';
import { useHomeContent } from './useHomeContent';
import {
  selectContentProducts,
  type HomeContentKey,
  type HomeContentDocument,
  type HomeContentSection,
} from './contracts';
import { ContentState } from './ContentState';
import { ContentImage } from './ContentImage';
import { ContentProducts } from './ContentProducts';
import { ContentTiles } from './ContentTiles';
import { mapContentProduct } from './productMapping';
import { HomeGrownBackground } from '../fresh/home-grown-nearby/HomeGrownBackground';
import { BROWSE_LOADING_COPY } from '../loading/BrowseLoadingText';

type Inventory = ReturnType<typeof useNearbyGroceryInventory>;
function ManagedSection({
  tabKey,
  section,
  inventory,
}: {
  tabKey: HomeContentKey;
  section: HomeContentSection;
  inventory: Inventory;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const products = selectContentProducts(
    inventory.visibleProducts,
    section.selection,
    section.limit,
  ).map(mapContentProduct);
  const openCollection = (itemId?: string) =>
    navigation.navigate('HomeContentCollection', { tabKey, sectionId: section.id, itemId });
  const items = section.items.filter(
    (item) =>
      item.enabled &&
      (!section.hideWhenEmpty ||
        !inventory.hasLocation ||
        inventory.isLoading ||
        inventory.isError ||
        selectContentProducts(inventory.visibleProducts, item.selection, 1).length > 0),
  );
  const shops =
    section.kind === 'stores'
      ? inventory.inventory
          .map(({ store, products: stock }) => ({
            ...store,
            products: selectContentProducts(stock, section.selection, 3).map(mapContentProduct),
          }))
          .filter((store) => store.products.length > 0)
          .slice(0, section.limit)
      : [];
  const hasItems =
    section.kind === 'stores'
      ? shops.length > 0
      : ['categories', 'brands'].includes(section.kind)
        ? items.length > 0
        : products.length > 0;
  if (
    section.hideWhenEmpty &&
    section.kind !== 'footer' &&
    !(section.kind === 'banner' && section.imageUrl) &&
    !hasItems &&
    !inventory.isLoading &&
    !inventory.isError &&
    inventory.hasLocation
  )
    return null;
  if (section.kind === 'footer')
    return (
      <View
        className="mt-8 px-6 pb-44 pt-10"
        style={{ backgroundColor: section.backgroundColor || undefined }}
      >
        <Text className="text-5xl font-semibold tracking-tight text-ink/10">{section.title}</Text>
        {section.subtitle && (
          <Text className="mt-2 text-sm font-medium text-ink/50">{section.subtitle}</Text>
        )}
      </View>
    );
  const heading =
    section.title || section.subtitle ? (
      <SectionTitle subtitle={section.subtitle}>{section.title}</SectionTitle>
    ) : null;
  const state = (
    <ContentState
      {...inventory}
      emptyMessage={
        section.kind === 'brands'
          ? 'Local brands will appear here soon.'
          : section.kind === 'stores'
            ? 'No nearby shops have these products available right now.'
            : 'No available products nearby right now.'
      }
    />
  );
  const button = section.buttonEnabled ? (
    <View className="px-5">
      <SeeAllProductsButton
        products={products}
        sectionTitle={section.title || 'products'}
        label={section.buttonLabel}
        avatarCount={section.kind === 'hero' ? 2 : 3}
        onPress={() => openCollection()}
      />
    </View>
  ) : null;
  if (section.kind === 'banner')
    return (
      <View className="mx-5 mt-8 items-center">
        <View
          className="w-full overflow-hidden rounded-t-[28px]"
          style={{ maxWidth: 420, backgroundColor: section.backgroundColor || '#FFFFFF' }}
        >
          <ContentImage
            section={section}
            naturalAspectRatio={tabKey === 'regional' && section.id === 'regional-brand-banner'}
          />
          {(heading || button) && (
            <View className="py-5">
              {heading}
              {button}
            </View>
          )}
        </View>
      </View>
    );
  if (section.kind === 'hero')
    return (
      <View
        className="relative mt-8 overflow-hidden pb-6"
        style={{ backgroundColor: section.backgroundColor || '#FFFFFF' }}
      >
        {section.id === 'home-grown-nearby' && (
          <HomeGrownBackground color={section.backgroundColor || '#FFFFFF'} />
        )}
        <View className="relative mb-2 min-h-[128px] items-end">
          <ContentImage section={section} side={section.id === 'home-grown-nearby'} />
          <Text
            accessibilityRole="header"
            numberOfLines={3}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            className="absolute left-0 right-0 top-0 z-10 px-6 pt-5 text-[26px] font-bold leading-[32px] tracking-[-0.8px] text-[#34452A]"
          >
            {section.title}
          </Text>
        </View>
        {section.subtitle && (
          <Text className="mb-4 px-5 text-[13px] text-ink/60">{section.subtitle}</Text>
        )}
        {products.length ? <ContentProducts products={products} section={section} /> : state}
        {button}
      </View>
    );
  return (
    <View className="pt-8" style={{ backgroundColor: section.backgroundColor || undefined }}>
      {heading}
      {section.kind === 'products' && (
        <>
          {products.length ? <ContentProducts products={products} section={section} /> : state}
          {button}
        </>
      )}
      {(section.kind === 'categories' || section.kind === 'brands') && (
        <>
          {items.length ? (
            <ContentTiles
              featuredCategories={tabKey === 'grocery' && section.id === 'shop-by-category'}
              section={{ ...section, items }}
              products={inventory.visibleProducts}
              onOpen={(item) => openCollection(item.id)}
            />
          ) : (
            state
          )}
          {button}
        </>
      )}
      {section.kind === 'stores' &&
        (shops.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-start gap-3 px-5 pb-2"
            snapToInterval={320}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {shops.map((store) => {
              const onOpen = () =>
                navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name });
              return tabKey === 'regional' ? (
                <RegionalShopCard
                  key={store.id}
                  {...store}
                  buttonLabel={section.buttonLabel}
                  showButton={section.buttonEnabled}
                  onOpen={onOpen}
                />
              ) : (
                <GroceryStorePreviewCard
                  key={store.id}
                  store={store}
                  onOpen={onOpen}
                  buttonLabel={section.buttonLabel}
                  showButton={section.buttonEnabled}
                />
              );
            })}
          </ScrollView>
        ) : (
          state
        ))}
    </View>
  );
}
function PublishedTab({
  tabKey,
  content,
}: {
  tabKey: HomeContentKey;
  content: HomeContentDocument;
}) {
  const inventory = useNearbyGroceryInventory(tabKey);
  // Reveal one complete first-load layout. Cached shelves remain on screen
  // during refetches; a slow shop must not create a spinner in every section.
  if (inventory.isLoading)
    return <View className="pt-8"><ContentState {...inventory} loadingMessage={BROWSE_LOADING_COPY[tabKey]} /></View>;
  return (
    <View>
      {content.sections
        .filter((section) => section.enabled)
        .map((section) => (
          <ManagedSection
            key={section.id}
            tabKey={tabKey}
            section={section}
            inventory={inventory}
          />
        ))}
      {!content.sections.some((section) => section.enabled && section.kind === 'footer') && (
        <View className="h-44" />
      )}
    </View>
  );
}
export function ManagedHomeTab({ tabKey }: { tabKey: HomeContentKey }) {
  const query = useHomeContent();
  const record = query.data?.find((row) => row.tabKey === tabKey);
  if (!record)
    return (
      <View className="pt-8">
        <ContentState
          isLoading={query.isPending}
          isError={query.isError}
          retry={() => void query.refetch()}
          emptyMessage="This tab is not available right now."
          loadingMessage={BROWSE_LOADING_COPY[tabKey]}
        />
      </View>
    );
  if (!record.content.enabled) return null;
  return <PublishedTab tabKey={tabKey} content={record.content} />;
}
