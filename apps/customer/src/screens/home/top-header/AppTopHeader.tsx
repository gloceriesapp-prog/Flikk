// The shared Home/Store header: blue top with location + profile (folds on
// scroll), then a white sheet with rounded top holding search and the NEW for you tile.
// Rendered once by HomeNavigationShell, so switching tabs never rebuilds it.

import { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';
import { useIsOutsideOperatingHours } from '../../../utils/useOperatingHours';
import { CollapsibleHeaderTop } from '../components/CollapsibleHeaderTop';
import { HeaderBackgroundGradient } from '../components/HeaderBackgroundGradient';
import { HomeSearchBar } from '../components/HomeSearchBar';
import { useActiveHeaderGradient } from '../data/useActiveHeaderGradient';
// import { HomeHeaderNotice } from '../components/HomeReveal';
import { NewForYouTile } from './NewForYouTile';
import { HomeModeSwitch } from '../mode-switch/HomeModeSwitch';
import { useHeaderTint, useTintToWhite } from '../header-theme/homeHeaderTheme';
import { TopHeaderScrollContext } from './topHeaderScroll';

const WHITE = { backgroundColor: '#FFFFFF' };

export function AppTopHeader() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const fallbackScroll = useSharedValue(0);
  const scrollY = useContext(TopHeaderScrollContext) ?? fallbackScroll;
  const isClosed = useIsOutsideOperatingHours();
  const gradient = useActiveHeaderGradient('all', false);
  // The Gloceries / Udupi switch belongs to Home only, not Store.
  const showModeSwitch = useRoute().name === 'Home';
  // On Home the header wears the browsing colour (header-theme/); the
  // search sheet starts in it and whitens on scroll.
  const tint = useHeaderTint();
  const headerStyle = useAnimatedStyle(() => ({ backgroundColor: tint.value }));
  const sheetStyle = useTintToWhite(scrollY, tint);

  return (
    <View className="overflow-hidden">
      {showModeSwitch && <HomeModeSwitch scrollY={scrollY} />}
      <View className={showModeSwitch ? undefined : 'pt-safe'}>
        {showModeSwitch
          ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, headerStyle]} />
          : <HeaderBackgroundGradient colors={gradient.colors} />}
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
        <Animated.View className="mt-0.5 flex-row items-end gap-2 rounded-t-[28px] px-4 pb-2 pt-1" style={showModeSwitch ? sheetStyle : WHITE}>
          <View className="flex-1">
            <HomeSearchBar onPress={() => navigation.navigate('Search')} borderClassName="" surfaceClassName="bg-[#F1F2F4]" />
          </View>
          <NewForYouTile />
        </Animated.View>
      </View>
    </View>
  );
}
