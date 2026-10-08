import { View } from 'react-native';
import { SectionTitle } from '../components/SectionTitle';
import { ALL_TAB, buildHomeCategories } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { QuickCategoryCard } from './QuickCategoryCard';
import { quickCategoryRows } from './layout';
import { GROCERY_QUICK_CATEGORY_IMAGE, GROCERY_IMAGE_BOTTOM_BLEED } from './data';
import { useCopy, useCopyImage } from '../../../api/appConfig';

interface Props {
  onSelectCategory: (id: string) => void;
  title?: string;
  showTitle?: boolean;
}

export function QuickCategoriesSection({ onSelectCategory, title = 'Quick categories', showTitle = true }: Props) {
  const { data: tabs = [] } = useHomeTabs();
  // Admin App content: home.quickCategories.hiddenTabs (comma-separated tab
  // names, matched on the tab's name or label) hides only these shortcuts,
  // preserving their actual tabs/routes; groceryImageUrl swaps the artwork.
  const hiddenNames = new Set(useCopy('home.quickCategories.hiddenTabs').split(',')
    .map((name) => name.trim().toLowerCase()).filter(Boolean));
  const groceryImage = useCopyImage('home.quickCategories.groceryImageUrl', GROCERY_QUICK_CATEGORY_IMAGE);
  const sourceTabs = tabs;
  const excludedIds = new Set(sourceTabs
    .filter((tab) => hiddenNames.has(tab.name.trim().toLowerCase()) || hiddenNames.has((tab.label ?? '').trim().toLowerCase()))
    .map((tab) => tab.id));
  const groceryIds = new Set(sourceTabs
    .filter((tab) => tab.contentKey === 'grocery' || ['grocery', 'groceries'].includes(tab.name.trim().toLowerCase()))
    .map((tab) => tab.id));
  // The admin festival tab's own header artwork (festival_greeting, 112).
  const festivalImages = new Map(sourceTabs
    .filter((tab) => tab.festival)
    .map((tab) => [tab.id, tab.festival?.headerImageUri ?? undefined] as const));
  const categories = buildHomeCategories(tabs).filter((category) => category.id !== ALL_TAB.id && !excludedIds.has(category.id));
  const rows = quickCategoryRows(categories);
  if (rows.length === 0) return null;

  return (
    <View className={showTitle ? 'pt-8' : 'pt-2'}>
      {showTitle && <SectionTitle>{title}</SectionTitle>}
      <View className="gap-2 px-5">
        {rows.map((row) => (
          <View key={row[0].category.id} className="flex-row items-stretch gap-2">
            {row.map(({ category, weight }) => (
              <View key={category.id} style={{ flex: weight, minWidth: 0 }}>
                <QuickCategoryCard
                  category={category}
                  onSelect={onSelectCategory}
                  imageUrl={groceryIds.has(category.id) ? groceryImage : festivalImages.get(category.id)}
                  imageBottomBleed={groceryIds.has(category.id) ? GROCERY_IMAGE_BOTTOM_BLEED : 0}
                  imageScale={festivalImages.has(category.id) ? 1.12 : 1}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
