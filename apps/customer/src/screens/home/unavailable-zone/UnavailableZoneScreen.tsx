// Full-screen replacement for Home when the picked delivery location has no
// real store within the 12km delivery radius (useNearestStore.ts's own
// isServiceable, backed by GET /stores/nearest's server-side distance
// cutoff — single-zone-only per CLAUDE.md). Swaps in for the ENTIRE Home
// body (header, category tabs, all sections) rather than just one section —
// none of that browsing UI applies when there's nothing nearby to browse.
//
// Header row restored (real "Delivering to" address, tap-through to
// SelectLocation — same useLocationStore this screen already read for the
// old copy) + a profile button on the right using the exact same icon
// DeliveryModeSwitcher.tsx's own profile shortcut uses (UserIcon,
// navigates to Profile) — per an explicit ask to reuse that same icon
// rather than a different one. Styled dark-on-light (ink, not
// LocationSelector.tsx's white) since that component assumes HomeHeader's
// dark gradient; this panel is the light PANEL_BG pink instead.
//
// Centered badge/headline/subtext block below that, then a store
// illustration, then the same real CategorySections grid every other
// screen uses (GET /category-sections, not a fabricated list) and
// BrandFooter with its social-links row. The upvote button (shared
// useAreaUpvote, same one as the old floating UpvoteAreaBar pill) sits
// pinned at the very bottom.

import { useState } from 'react';
import { CheckmarkCircle02Icon, ChevronDownIcon, ThumbsUpIcon, UserIcon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { AppImage as Image } from '../../../components/AppImage';
import { BrandFooter } from '../../../components/BrandFooter';
import { CategorySections } from '../../../components/CategorySections/CategorySections';
import { useAreaUpvote } from '../../../hooks/useAreaUpvote';
import { useLocationStore } from '../../../store/useLocationStore';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import { storageUrl } from '../../../utils/storageUrl';
import { useCopy } from '../../../api/appConfig';

const PANEL_BG = '#F7DEDC';
const ILLUSTRATION_URL = storageUrl('Images/store-coming-soon.png');

export function UnavailableZoneScreen() {
  const insets = useSafeAreaInsets();
  const title = useCopy('serviceability.unavailable.title');
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const location = useLocationStore((s) => s.location);
  const addressLabel = location?.addressLabel || location?.city || 'Set your location';
  const { voted, submitting, upvote } = useAreaUpvote();
  // Real dimensions from the loaded file, not a guessed constant — a wrong
  // guess either crops the image (contentFit="cover") or letterboxes it
  // wrong (contentFit="contain" with the wrong ratio). Falls back to a
  // square box only until onLoad fires once.
  const [illustrationRatio, setIllustrationRatio] = useState(1);

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }} bounces={false}>
        <View style={{ backgroundColor: PANEL_BG, paddingTop: insets.top }}>
          <View className="flex-row items-center gap-3 px-5 pb-8">
            <Pressable onPress={() => navigation.navigate('SelectLocation')} className="flex-1">
              <Text className="text-[14px] font-medium" style={{ color: colors.danger }}>
                Not deliverable here
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-[18px] font-medium text-ink" numberOfLines={1}>
                  {addressLabel}
                </Text>
                <AppIcon icon={ChevronDownIcon} size={17} color={colors.ink} strokeWidth={2.2} />
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open profile"
              onPress={() => navigation.navigate('Profile')}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <AppIcon icon={UserIcon} size={18} color={colors.ink} strokeWidth={1.8} />
            </Pressable>
          </View>

          <View className="items-center gap-4 px-8 pb-6">
            <View className="rounded-full bg-white px-3.5 py-1.5">
              <Text className="text-[12px] font-semibold" style={{ color: colors.danger }}>
                ✦ Coming Soon
              </Text>
            </View>
            <Text className="text-center text-[24px] font-semibold leading-8 text-ink/90">{title}</Text>
            <Text className="text-center text-[15px] font-medium leading-6 text-ink/60">
              Gloceries isn&apos;t in your area just yet, but you can help us get there faster.
            </Text>
          </View>

          <Image
            source={{ uri: ILLUSTRATION_URL }}
            style={{ width: '100%', aspectRatio: illustrationRatio }}
            contentFit="contain"
            onLoad={(e) => setIllustrationRatio(e.source.width / e.source.height)}
          />
        </View>

        <CategorySections />

        <BrandFooter showSocialLinks />
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 16 }}
      >
        <Pressable
          onPress={upvote}
          disabled={voted || submitting}
          className="flex-row items-center justify-center gap-2.5 rounded-full bg-ink px-7 py-[18px] shadow-xl shadow-black/30"
          style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <AppIcon icon={voted ? CheckmarkCircle02Icon : ThumbsUpIcon} size={19} color="#FFFFFF" />
          )}
          <Text className="text-[15px] font-medium tracking-tight text-white">
            {voted ? "Thanks! We'll get to you soon" : 'Upvote, bring the app to your area'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
