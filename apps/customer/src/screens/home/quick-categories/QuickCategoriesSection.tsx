import { View } from 'react-native';
import { SectionTitle } from '../components/SectionTitle';
import { ALL_TAB, buildHomeCategories, withHomeCategoryTabs } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { isFestivalTabName } from '../festival/data';
import { QuickCategoryCard } from './QuickCategoryCard';
import { quickCategoryRows } from './layout';
import { GROCERY_QUICK_CATEGORY_IMAGE, GROCERY_IMAGE_BOTTOM_BLEED, NAVRATRI_QUICK_CATEGORY_IMAGE } from './data';

interface Props {
  onSelectCategory: (id: string) => void;
  title?: string;
  showTitle?: boolean;
}

export function QuickCategoriesSection({ onSelectCategory, title = 'Quick categories', showTitle = true }: Props) {
  const { data: tabs = [] } = useHomeTabs();
  // Hide only these shortcuts, preserving their actual tabs/routes. Match
  // stable source names so an admin label override cannot bring them back.
  const sourceTabs = withHomeCategoryTabs(tabs);
  const excludedIds = new Set(sourceTabs
    .filter((tab) => ['bakery', 'bakeries', 'parts & tools'].includes(tab.name.trim().toLowerCase()))
    .map((tab) => tab.id));
  const groceryIds = new Set(sourceTabs
    .filter((tab) => tab.contentKey === 'grocery' || ['grocery', 'groceries'].includes(tab.name.trim().toLowerCase()))
    .map((tab) => tab.id));
  const festivalIds = new Set(sourceTabs
    .filter((tab) => !tab.contentKey && isFestivalTabName(tab.name))
    .map((tab) => tab.id));
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
                  imageUrl={groceryIds.has(category.id) ? GROCERY_QUICK_CATEGORY_IMAGE : festivalIds.has(category.id) ? NAVRATRI_QUICK_CATEGORY_IMAGE : undefined}
                  imageBottomBleed={groceryIds.has(category.id) ? GROCERY_IMAGE_BOTTOM_BLEED : 0}
                  imageScale={festivalIds.has(category.id) ? 1.12 : 1}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
