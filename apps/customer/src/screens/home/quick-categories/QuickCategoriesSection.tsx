import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { selectQuickCategoryTabs } from './selection';
import { SectionTitle } from '../components/SectionTitle';
import { ALL_TAB, buildHomeCategories } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { QuickCategoryCard } from './QuickCategoryCard';
import { quickCategoryRows } from './layout';
import { GROCERY_QUICK_CATEGORY_IMAGE, quickCategoryArtwork } from './data';
import { useCopy, useCopyImage } from '../../../api/appConfig';

interface Props {
  onSelectCategory: (id: string) => void;
  title?: string;
  showTitle?: boolean;
}

export function QuickCategoriesSection({ onSelectCategory, title = 'Quick categories', showTitle = true }: Props) {
  const { data: tabs = [] } = useHomeTabs();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Admin App content: home.quickCategories.hiddenTabs (comma-separated tab
  // names, matched on the tab's name or label) hides only these shortcuts,
  // preserving their actual tabs/routes; groceryImageUrl swaps the artwork.
  const hiddenNames = new Set(useCopy('home.quickCategories.hiddenTabs').split(',')
    .map((name) => name.trim().toLowerCase()).filter(Boolean));
  const groceryImage = useCopyImage('home.quickCategories.groceryImageUrl', GROCERY_QUICK_CATEGORY_IMAGE);
  const sourceTabs = selectQuickCategoryTabs(tabs, hiddenNames);
  const selectCategory = (id: string) => {
    const tab = sourceTabs.find(item => item.id === id);
    const link = tab?.quickCategory?.link;
    if (link) navigation.navigate('CategoryDetail', { categoryId: link.categoryId, label: tab?.label ?? tab?.name ?? 'Products', subcategoryId: link.type === 'subcategory' ? link.id : undefined });
    else onSelectCategory(id);
  };
  const groceryIds = new Set(sourceTabs
    .filter((tab) => tab.contentKey === 'grocery' || ['grocery', 'groceries'].includes(tab.name.trim().toLowerCase()))
    .map((tab) => tab.id));
  // The admin festival tab's own header artwork (festival_greeting, 112).
  const festivalImages = new Map(sourceTabs
    .filter((tab) => tab.festival)
    .map((tab) => [tab.id, tab.festival?.headerImageUri ?? undefined] as const));
  const tabImages = new Map(sourceTabs.map((tab) => [tab.id, tab.imageUrl] as const));
  const categories = buildHomeCategories(sourceTabs).filter((category) => category.id !== ALL_TAB.id);
  const rows = quickCategoryRows(categories);
  if (rows.length === 0) return null;

  return (
    <View className={showTitle ? 'pt-8' : 'pt-2'}>
      {showTitle && <SectionTitle>{title}</SectionTitle>}
      <View className="gap-2 px-5">
        {rows.map((row) => (
          <View key={row[0].category.id} className="flex-row items-stretch gap-2">
            {row.map(({ category, weight }) => {
              const artwork = quickCategoryArtwork({
                tabImage: tabImages.get(category.id),
                isGrocery: groceryIds.has(category.id),
                groceryImage,
                festivalImage: festivalImages.get(category.id),
              });
              return (
                <View key={category.id} style={{ flex: weight, minWidth: 0 }}>
                  <QuickCategoryCard
                    category={category}
                    onSelect={selectCategory}
                    imageUrl={artwork.imageUrl}
                    imageBottomBleed={artwork.bottomBleed}
                    imageScale={artwork.scale}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
