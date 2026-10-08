// Screen 1 of the onboarding wizard — a full-bleed hero, no fields, just a
// "Get Started" tap. That tap is what fetches the saved draft
// (GET /partner/store-draft) and decides which real step to resume at,
// replacing the old StoreSetupScreen's own cold-start-effect resume pattern
// (this screen collects nothing itself, so there's nothing to lose by doing
// the fetch on-tap instead of on-mount). Only reached when OtpVerification's
// verify response says has_store: false, and is also the fixed entry point
// RootNavigator drops a returning has_store:false session at (see that
// file's own note).
//
// UI ported from apps/rider's own OnboardingIntroScreen so both apps' wizards
// open the same way: hero photo, bottom ink gradient scrim, white pill CTA.

import { useState } from 'react';
import { ImageBackground, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchStoreDraft } from '../../api/auth';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList, StoreDraft } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingIntro'>;

// Same store photo the Login/OTP screens already use — one hero image
// across the whole partner auth flow.
const HERO_IMAGE = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/store-image.jpeg';

const EMPTY_DRAFT: StoreDraft = {
  storeName: '',
  category: '',
  phone: '',
  district: null,
  addressLine: null,
  manualAddress: '',
  coordinates: null,
  photoUrl: null,
  gstNumber: '',
  ownerName: '',
  ownerEmail: '',
  shopLicenseNumber: '',
  fssaiNumber: '',
  panNumber: '',
  udyamNumber: '',
  drugLicenseNumber: '',
  openTime: '',
  closeTime: '',
};

export function OnboardingIntroScreen({ navigation, route }: Props) {
  const editDraft = route.params?.draft;
  const [loading, setLoading] = useState(false);

  async function handleGetStarted() {
    if (editDraft) {
      navigation.navigate('StoreDetails', { draft: editDraft });
      return;
    }

    setLoading(true);
    let draft = EMPTY_DRAFT;
    try {
      const saved = await fetchStoreDraft();
      if (saved) {
        draft = {
          storeName: saved.store_name ?? '',
          category: saved.category ?? '',
          phone: saved.phone ?? '',
          district: saved.district,
          addressLine: saved.address_line,
          manualAddress: saved.manual_address ?? '',
          coordinates: saved.lat !== null && saved.lng !== null ? { latitude: saved.lat, longitude: saved.lng } : null,
          photoUrl: saved.photo_url,
          gstNumber: saved.gst_number ?? '',
          ownerName: saved.owner_name ?? '',
          ownerEmail: saved.owner_email ?? '',
          shopLicenseNumber: saved.shop_establishment_number ?? '',
          fssaiNumber: saved.fssai_number ?? '',
          panNumber: saved.pan_number ?? '',
          udyamNumber: saved.udyam_number ?? '',
          drugLicenseNumber: saved.drug_license_number ?? '',
          openTime: saved.open_time ?? '',
          closeTime: saved.close_time ?? '',
        };
      }
    } catch {
      // No draft yet, or a transient fetch failure — starting fresh is the
      // safe default either way.
    } finally {
      setLoading(false);
    }

    // Resume at the first step whose own required field is still missing —
    // a returning applicant never has to redo an already-completed step.
    if (!draft.storeName || !draft.category || !draft.phone || (draft.category === 'Pharmacy' && !draft.drugLicenseNumber)) {
      navigation.navigate('StoreDetails', { draft });
    } else if (!draft.district) {
      navigation.navigate('StoreLocation', { draft });
    } else if (!draft.ownerName) {
      navigation.navigate('OwnerDetails', { draft });
    } else if (!draft.panNumber) {
      navigation.navigate('BusinessDocuments', { draft });
    } else if (!draft.openTime || !draft.closeTime) {
      navigation.navigate('StoreHours', { draft });
    } else {
      navigation.navigate('StoreReview', { draft });
    }
  }

  return (
    <View className="flex-1 bg-ink">
      {/* Light status-bar icons over the dark hero photo. */}
      <StatusBar style="light" />
      <ImageBackground source={{ uri: HERO_IMAGE }} resizeMode="cover" className="flex-1">
        {/* Bottom-weighted ink scrim so the white headline + pill read
            cleanly over any photo. */}
        <LinearGradient
          colors={['transparent', 'rgba(16,28,16,0.35)', 'rgba(16,28,16,0.92)']}
          locations={[0, 0.45, 0.82]}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-end px-6 pb-safe-offset-6 pt-safe-offset-8">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Text style={{ fontSize: 28 }}>🏬</Text>
            </View>
            <Text className="mt-5 text-[34px] font-bold leading-[40px] tracking-tight text-white">
              Let&rsquo;s get your{'\n'}store online
            </Text>
            <Text className="mt-3 max-w-[320px] text-[16px] font-medium leading-[22px] text-white/70">
              Takes about 5 minutes. You can always update these details later.
            </Text>

            <Pressable
              onPress={handleGetStarted}
              disabled={loading}
              className="mt-8 h-[54px] flex-row items-center justify-center gap-2 rounded-full bg-white"
              style={({ pressed }) => ({ opacity: pressed || loading ? 0.9 : 1 })}
            >
              <Text className="text-[16px] font-semibold text-ink">{loading ? 'Loading…' : 'Get Started'}</Text>
              {!loading && <AppIcon icon={ArrowRight01Icon} size={19} color={colors.ink} />}
            </Pressable>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
