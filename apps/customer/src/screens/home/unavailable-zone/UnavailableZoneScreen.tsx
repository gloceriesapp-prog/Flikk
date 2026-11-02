import { useCopy } from '../../../api/appConfig';
// Full-screen replacement for Home when the picked delivery location has no
// real store within the 12km delivery radius (useNearestStore.ts's own
// isServiceable, backed by GET /stores/nearest's server-side distance
// cutoff — single-zone-only per CLAUDE.md). Swaps in for the ENTIRE Home
// body (header, category tabs, all sections) rather than just one section —
// none of that browsing UI applies when there's nothing nearby to browse.
// The bundled artwork renders without a network request. The overlay measures
// its content so larger text stays in the sky above the scenery. Location,
// categories, waitlist and upvote behavior remain shared with the normal flow.

import { useState } from 'react';
import { CheckmarkCircle02Icon, ChevronDownIcon, ThumbsUpIcon, UserIcon } from '@hugeicons/core-free-icons';
import { Alert, ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';
import { BrandFooter } from '../../../components/BrandFooter';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { useAuthStore } from '../../../store/useAuthStore';
import { subscribeAreaWaitlist } from '../../../api/areaUpvotes';
import { useAreaUpvote } from '../../../hooks/useAreaUpvote';
import { useLocationStore } from '../../../store/useLocationStore';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import { ScreenStatusBar as StatusBar } from '../../../components/ScreenStatusBar';

const SKY_BG = '#025FFA';
const ILLUSTRATION = require('../../../../assets/illustrations/unavailable-area.png');
const ILLUSTRATION_RATIO = 1122 / 1402;

export function UnavailableZoneScreen() {
  const insets = useSafeAreaInsets();
  const configuredTitle = useCopy('serviceability.unavailable.title');
  // Older deployments can still return the previous built-in default.
  const title = configuredTitle === 'We’re on our way to you.' ? 'Your Area Could Be Next!' : configuredTitle;
  const { width } = useWindowDimensions();
  const [overlayHeight, setOverlayHeight] = useState(0);
  const imageHeight = width / ILLUSTRATION_RATIO;
  const heroHeight = Math.max(imageHeight, overlayHeight + imageHeight * 0.6);
  const isFocused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const location = useLocationStore((s) => s.location);
  const placeName = location?.addressLabel?.trim() || location?.city?.trim() || 'Set your location';
  const { voted, submitting, upvote } = useAreaUpvote();
  const customerId = useAuthStore(state => state.customerId);
  const sessionEpoch = useAuthStore(state => state.sessionEpoch);
  const waitlistKey = JSON.stringify([customerId, sessionEpoch, location?.latitude, location?.longitude, location?.addressLabel]);
  const [joiningKey, setJoiningKey] = useState<string | null>(null);
  const [joinedKey, setJoinedKey] = useState<string | null>(null);
  const joining = joiningKey === waitlistKey;
  const joined = joinedKey === waitlistKey;

  return (
    <View className="flex-1 bg-white">
      {isFocused && <StatusBar style="light" />}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} bounces={false}>
        <View style={{ backgroundColor: SKY_BG, height: heroHeight, overflow: 'hidden' }}>
          <Image source={ILLUSTRATION} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', aspectRatio: ILLUSTRATION_RATIO }} contentFit="contain" priority="high" transition={0} accessible={false} />
          <View style={{ paddingTop: insets.top }} onLayout={event => setOverlayHeight(event.nativeEvent.layout.height)}>
          <View className="flex-row items-center justify-between gap-4 px-5 pb-9 pt-2">
            <Pressable onPress={() => navigation.navigate('SelectLocation')}
              className="min-h-11 min-w-0 flex-shrink gap-1.5"
              style={{ maxWidth: 230, flex: 1 }}
              accessibilityRole="button" accessibilityLabel={`Selected area: ${placeName}. Change location`}
            >
              <Text className="text-[11px] font-medium tracking-[1.4px] text-white/75">YOUR AREA</Text>
              <View className="flex-row items-center gap-2">
                <Text className="shrink text-[16px] font-semibold leading-6 text-white" numberOfLines={1} ellipsizeMode="tail" >
                  {placeName}
                </Text>
                <AppIcon icon={ChevronDownIcon} size={15} color="#FFFFFF" strokeWidth={2} />
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open profile"
              onPress={() => navigation.navigate('Profile')}
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
            >
              <AppIcon icon={UserIcon} size={18} color={colors.ink} strokeWidth={1.8} />
            </Pressable>
          </View>

          <View className="items-center gap-4 self-center px-7 pb-6" style={{ width: '100%', maxWidth: 440 }}>
            <View className="rounded-full bg-white px-3.5 py-1.5">
              <Text className="text-[12px] font-semibold" style={{ color: SKY_BG }}>
                ✦ A little closer, soon
              </Text>
            </View>
            <Text className="text-center text-[27px] font-semibold leading-[34px] tracking-[-0.6px] text-white">{title}</Text>
            <Text className="text-center text-[14px] font-medium leading-[22px] text-white/90">
              Good groceries, closer to home. Vote to bring Gloceries to your neighbourhood.
            </Text>
          </View>

          </View>
        </View>

        <View className="px-5 py-4"><Pressable disabled={joining || joined || !location} onPress={async () => {
          if (!location || joining) return;
          setJoiningKey(waitlistKey);
          try { await subscribeAreaWaitlist(location); setJoinedKey(waitlistKey); }
          catch { Alert.alert('Could not join waitlist', 'Sign in and check your connection, then try again.'); }
          finally { setJoiningKey(key => key === waitlistKey ? null : key); }
        }}><Text className="text-center font-semibold text-blue-600">{joined ? 'You’re on the launch waitlist' : joining ? 'Joining…' : 'Notify me when Gloceries launches here'}</Text></Pressable></View>
        <CategorySections />

        <BrandFooter showSocialLinks />
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 12, alignItems: 'center' }}
      >
        <Pressable
          onPress={upvote}
          disabled={voted || submitting}
          accessibilityRole="button" accessibilityLabel={voted ? 'Your area vote is saved' : 'Vote to bring Gloceries to your area'}
          className="min-h-14 flex-row items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-4"
          style={{ width: '100%', maxWidth: 440, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppIcon icon={voted ? CheckmarkCircle02Icon : ThumbsUpIcon} size={19} color="#FFFFFF" />
          )}
          <Text className="shrink text-center text-[15px] font-semibold text-white">
            {voted ? 'Your vote is in. Thank you!' : 'Bring Gloceries to my area'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
