// PRD screen C3 (Home). The header (ETA, location, search, categories) is
// real UI. The body reacts to the selected category:
//   'all'         -> deals promo + Today's Deal + Bestsellers (sections/)
//   'fresh-fish'  -> the Fresh Fish grid (fish/)
//   everything else -> placeholder
// Full discovery/browse (store lists, C4/C5) is separate work, see
// specs/01-customer-app/screens.md.

import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { HomeHeader } from './components/HomeHeader';
import { FishProductGrid } from './fish/FishProductGrid';
import { AllTabSections } from './sections/AllTabSections';
import { HOME_CATEGORIES } from './data/categories';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(HOME_CATEGORIES[0]?.id ?? 'all');

  return (
    // BottomNavBar is a sibling of the ScrollView, not inside its scrollable
    // content — that's what keeps it floating fixed in place while the page
    // scrolls underneath it.
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="pb-28" stickyHeaderIndices={[0]}>
        <HomeHeader
          onChangeLocation={() => navigation.navigate('LocationSearch')}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        {selectedCategoryId === 'all' && <AllTabSections />}

        {selectedCategoryId === 'fresh-fish' && <FishProductGrid />}

        {selectedCategoryId !== 'all' && selectedCategoryId !== 'fresh-fish' && (
          <View className="items-center justify-center gap-2 px-6 py-16">
            <Text className="text-base font-semibold text-ink">Store list goes here.</Text>
            <Text className="text-center text-sm text-ink/60">
              Browse/discovery (PRD C4/C5) is the next piece of work.
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNavBar />
    </View>
  );
}
