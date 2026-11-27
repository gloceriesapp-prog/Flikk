// The shared Home/Store header: blue top with location + profile (folds on
// scroll), then a white sheet with rounded top holding search and the NEW for you tile.
// Rendered once by HomeNavigationShell, so switching tabs never rebuilds it.

import { useContext } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { useIsOutsideOperatingHours } from '../../../utils/useOperatingHours';
import { CollapsibleHeaderTop } from '../components/CollapsibleHeaderTop';
import { HeaderBackgroundGradient } from '../components/HeaderBackgroundGradient';
import { HomeSearchBar } from '../components/HomeSearchBar';
import { useActiveHeaderGradient } from '../data/useActiveHeaderGradient';
// import { HomeHeaderNotice } from '../components/HomeReveal';
import { NewForYouTile } from './NewForYouTile';
import { TopHeaderScrollContext } from './topHeaderScroll';

export function AppTopHeader() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const fallbackScroll = useSharedValue(0);
  const scrollY = useContext(TopHeaderScrollContext) ?? fallbackScroll;
  const isClosed = useIsOutsideOperatingHours();
  const gradient = useActiveHeaderGradient('all', false);

  return (
    <View className="overflow-hidden">
      <HeaderBackgroundGradient colors={gradient.colors} />
      <View className="pt-safe">
        {/* Paused for now: notice above the delivery estimate.
        <HomeHeaderNotice isClosed={isClosed} />
        */}
        <View className="px-6">
          <CollapsibleHeaderTop
            scrollY={scrollY}
            onChangeLocation={() => navigation.navigate('SelectLocation')}
            isClosed={isClosed}
          />
        </View>
        <View className="mt-3 flex-row items-end gap-2 rounded-t-[28px] bg-white px-4 pb-2 pt-3">
          <View className="flex-1">
            <HomeSearchBar onPress={() => navigation.navigate('Search')} borderClassName="" surfaceClassName="bg-[#F1F2F4]" />
          </View>
          <NewForYouTile />
        </View>
      </View>
    </View>
  );
}
