import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CategoryDetailHeader } from './components/CategoryDetailHeader';
import { SubCategorySidebar } from './components/SubCategorySidebar';
import { CategoryProductPane } from './components/CategoryProductPane';
import { DEFAULT_FILTERS, type ProductFilters } from './filters/productFilters';
import { isRealCategoryId } from './filters/productFilters';
import { useCategoryProducts, useRealSubCategories, useSubCategoryProducts } from './useRealCategoryDetail';
import type { DetailSubCategory } from './types';
import type { AppStackParamList } from '../../navigation/types';

const ALL_TAB: DetailSubCategory = { id: 'all', label: 'All' };
type Props = NativeStackScreenProps<AppStackParamList, 'CategoryDetail'>;

export function CategoryDetailScreen({ navigation, route }: Props) {
  return (
    <CategoryDetailContent
      key={route.params.categoryId}
      categoryId={route.params.categoryId}
      label={route.params.label}
      onBack={() => navigation.goBack()}
      onSearch={() => navigation.navigate('Search')}
    />
  );
}

interface ContentProps {
  categoryId: string;
  label: string;
  onBack: () => void;
  onSearch: () => void;
}

function CategoryDetailContent({ categoryId, label, onBack, onSearch }: ContentProps) {
  const [selectedSubId, setSelectedSubId] = useState('all');
  const isReal = isRealCategoryId(categoryId);
  const [filters, setFilters] = useState<ProductFilters>({ ...DEFAULT_FILTERS });
  const subCategories = useRealSubCategories(categoryId);
  const realSubCategories = subCategories.data ?? [];

  const sidebarItems = [ALL_TAB, ...realSubCategories];
  // If an admin removes a selected subcategory, fall back to All immediately.
  const activeSubId = sidebarItems.some((item) => item.id === selectedSubId)
    ? selectedSubId
    : sidebarItems[0]?.id ?? 'all';
  const categoryProducts = useCategoryProducts(isReal && activeSubId === 'all' ? categoryId : '', filters);
  const subProducts = useSubCategoryProducts(isReal && activeSubId !== 'all' ? activeSubId : undefined, filters);
  const activeQuery = activeSubId === 'all' ? categoryProducts : subProducts;
  const products = activeQuery.data?.pages.flatMap(page => page.products) ?? [];
  const facets = activeQuery.data?.pages[0]?.facets;
  const retry = () => {
    if (!isReal) return;
    void subCategories.refetch();
    void activeQuery.refetch();
  };

  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <CategoryDetailHeader title={label} onBack={onBack} onSearch={onSearch} />
      <View className="flex-1 flex-row">
        <SubCategorySidebar items={sidebarItems} selectedId={activeSubId} onSelect={setSelectedSubId} />
        <CategoryProductPane
          key={activeSubId}
          products={products}
          isLoading={isReal && activeQuery.isPending && activeQuery.fetchStatus !== 'idle'}
          isError={isReal && (activeQuery.isError || subCategories.isError)}
          onRetry={retry}
          previewOnly={false}
          filters={filters}
          onFiltersChange={setFilters}
          serverTypes={facets?.types}
          serverBrands={facets?.brands}
          onLoadMore={() => { if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) void activeQuery.fetchNextPage(); }}
          loadingMore={activeQuery.isFetchingNextPage}
        />
      </View>
    </View>
  );
}
