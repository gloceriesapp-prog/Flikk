// Home's header category row: picture + label per tab, All first. Tapping a
// tab swaps the Home body to that category in place (HomeScreen.tsx) instead
// of opening a page. Pictures reuse the Quick categories artwork rules.

import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useCopyImage } from '../../../api/appConfig';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage } from '../../../components/AppImage';
import { colors } from '../../../theme/tokens';
import { ALL_TAB, buildHomeCategories } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { GROCERY_QUICK_CATEGORY_IMAGE, quickCategoryArtwork } from '../quick-categories/data';

export function HomeCategoryTabs({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const { data: tabs = [] } = useHomeTabs();
  const groceryImage = useCopyImage('home.quickCategories.groceryImageUrl', GROCERY_QUICK_CATEGORY_IMAGE);
  // Admin App content; blank keeps the basket icon.
  const allImage = useCopyImage('home.categoryTabs.allImageUrl', '');
  const scrollRef = useRef<ScrollView>(null);
  // Each tab is as wide as its label, so remember where each one landed.
  const tabX = useRef(new Map<string, number>());
  const categories = buildHomeCategories(tabs);

  // Keep the selected tab in view, with a little of the previous one showing.
  useEffect(() => {
    const x = tabX.current.get(activeId);
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - 40), animated: true });
  }, [activeId]);

  if (tabs.length === 0) return null;

  return (
    <View className="border-b border-[#ECEEF1]">
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1 px-3">
        {categories.map((category) => {
          const tab = tabs.find((item) => item.id === category.id);
          const isGrocery = !!tab && (tab.contentKey === 'grocery' || ['grocery', 'groceries'].includes(tab.name.trim().toLowerCase()));
          const { imageUrl } = category.id === ALL_TAB.id ? { imageUrl: allImage || undefined } : quickCategoryArtwork({
            tabImage: tab?.imageUrl,
            isGrocery,
            groceryImage,
            festivalImage: tab?.festival?.headerImageUri ?? undefined,
          });
          const selected = category.id === activeId;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={category.label}
              onPress={() => onSelect(category.id)}
              onLayout={(event) => { tabX.current.set(category.id, event.nativeEvent.layout.x); }}
              className={`min-w-[76px] items-center rounded-t-[18px] px-3 pb-2.5 pt-2 ${selected ? 'bg-[#EEF3FF]' : ''}`}
            >
              <View className="h-[38px] w-[38px] items-center justify-center">
                {imageUrl ? (
                  <AppImage source={{ uri: imageUrl }} style={{ width: 38, height: 38 }} resizeMode="contain" accessible={false} />
                ) : (
                  <AppIcon icon={category.icon} size={26} color={selected ? colors.primary : colors.ink} />
                )}
              </View>
              <Text
                numberOfLines={1}
                // Same weight either way so the label never shifts width when picked.
                className={`mt-1 text-[13px] font-medium leading-[17px] ${selected ? 'text-ink' : 'text-ink/60'}`}
              >
                {category.label}
              </Text>
              {selected && <View className="absolute bottom-0 left-3 right-3 h-[3px] rounded-t-full" style={{ backgroundColor: colors.primary }} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
