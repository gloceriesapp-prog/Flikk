import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../loading/BrowseLoadingText';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '../../../navigation/types';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { useHomeTabs } from '../data/useHomeTabs';
import { HomeCategoryContent, homeCategoryKind } from './HomeCategoryContent';
import { useHomeBrowseScroll } from './useHomeBrowseScroll';
import { HomeCategoryBanner } from './components/HomeCategoryBanner';
import { storageUrl } from '../../../utils/storageUrl';

const GROCERY_HEADER_IMAGE_URI =
  storageUrl('Images/Royal%20Blue%20Tote%20of%20Indian%20Groceries.png');

export function HomeCategoryScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'HomeCategory'>) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const tabs = useHomeTabs();
  const tab = (tabs.data ?? []).find((item) => item.id === route.params.tabId);
  const categoryKind = tab ? homeCategoryKind(tab) : undefined;
  const isFestival = categoryKind === 'festival';
  const { scrollHandler } = useHomeBrowseScroll();

  return (
    <View className="flex-1 bg-white">
      {isFocused && <StatusBar style="dark" />}
      <Animated.ScrollView className="flex-1" contentContainerClassName="pb-28" contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} onScroll={scrollHandler} scrollEventThrottle={16} bounces={false} overScrollMode="never">
        <HomeCategoryBanner
          imageUri={isFestival ? tab?.festival?.headerImageUri ?? undefined : categoryKind === 'groceries' ? GROCERY_HEADER_IMAGE_URI : undefined}
          backgroundColor={isFestival ? tab?.festival?.backgroundColor : undefined}
          imageFit={isFestival ? 'contain' : 'cover'}
          seamless={isFestival}
        />
        {tab ? (
          <HomeCategoryContent key={tab.id} tab={tab} />
        ) : (
          <View className="items-center gap-4 px-6 py-16">
            {tabs.isResolvingTabs ? (
              <BrowseLoadingText message={BROWSE_LOADING_COPY.all} />
            ) : (
              <>
                <Text className="text-center text-sm text-ink/60">{tabs.hasTabLoadError ? 'We couldn’t load this category.' : 'This category is no longer available.'}</Text>
                <Pressable accessibilityRole="button" onPress={tabs.hasTabLoadError ? tabs.retryTabs : () => navigation.goBack()} className="min-h-11 justify-center rounded-2xl bg-[#F3F4F6] px-5">
                  <Text className="font-semibold text-ink">{tabs.hasTabLoadError ? 'Try again' : 'Back to Home'}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </Animated.ScrollView>
      {/* Artwork starts at the screen edge; only the floating control is
          inset below the status bar. Keep Back available while scrolling. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 20, zIndex: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={() => navigation.goBack()} className="h-11 w-11 items-center justify-center rounded-full border border-[#E8EBEF] bg-white active:bg-[#F3F4F6]" hitSlop={8}>
          <AppIcon icon={ArrowLeft01Icon} size={24} color="#101C10" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
