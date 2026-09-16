// Flat horizontal row, light-blue tiles per the reference UI — sits
// directly below MostShoppedSection. Same real tabs HomeHeader's own top
// CategoryTabs row reads (useHomeTabs -> GET /home-tabs, admin-managed),
// minus ALL_TAB per an explicit ask ("all" is "show everything", not a
// real category to shortcut into). Tapping a tile switches Home's real
// selected tab via onSelectCategory — the exact same state CategoryTabs
// itself drives, not a second/competing selection mechanism.

import { ScrollView, View } from 'react-native';
import { iconForTabName } from '../data/categoryTabs';
import { useHomeTabs } from '../data/useHomeTabs';
import { QuickCategoryTile } from './QuickCategoryTile';

export function QuickCategoryStrip({ onSelectCategory }: { onSelectCategory: (id: string) => void }) {
  const { data: tabs = [] } = useHomeTabs();

  if (tabs.length === 0) return null;

  return (
    <View className="pt-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4 px-5">
        {tabs.map((tab) => (
          <QuickCategoryTile
            key={tab.id}
            label={tab.name}
            icon={iconForTabName(tab.name)}
            onPress={() => onSelectCategory(tab.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
