// Reached by tapping the Home search bar (HomeSearchBar.tsx navigates here
// instead of allowing inline typing — see that file's comment). Real typing
// happens in SearchHeader; the quick-category chips and "Most searched
// Product" grid below are placeholder content, no live search wired yet.

import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProductSection } from '../home/products/ProductSection';
import { QuickCategoryGrid } from './components/QuickCategoryGrid';
import { SearchHeader } from './components/SearchHeader';
import { MOST_SEARCHED_PRODUCTS } from './data';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');

  return (
    <View className="flex-1 bg-white">
      <SearchHeader value={query} onChangeText={setQuery} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerClassName="pb-10">
        <QuickCategoryGrid />
        <ProductSection title="Most searched Product" products={MOST_SEARCHED_PRODUCTS} showDiscountBadge />
      </ScrollView>
    </View>
  );
}
