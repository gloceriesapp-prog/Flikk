// Screen 1 of the onboarding wizard — no fields, just a "Get Started" tap.
// That tap is what fetches the saved draft (GET /partner/store-draft) and
// decides which real step to resume at, replacing the old StoreSetupScreen's
// own cold-start-effect resume pattern (this screen collects nothing itself,
// so there's nothing to lose by doing the fetch on-tap instead of on-mount).
// Only reached when OtpVerification's verify response says has_store: false,
// and is also the fixed entry point RootNavigator drops a returning
// has_store:false session at (see that file's own note).

import { useState } from 'react';
import { Text, View } from 'react-native';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchStoreDraft } from '../../api/auth';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList, StoreDraft } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingIntro'>;

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
    if (!draft.storeName || !draft.category || !draft.phone) {
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
    <View className="flex-1 justify-between bg-white pb-safe-offset-4 pt-safe-offset-8 px-6">
      <View className="flex-1 items-center justify-center gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-3xl bg-lime-soft">
          <Text style={{ fontSize: 30 }}>🏬</Text>
        </View>
        <Text className="mt-3 text-center text-[26px] font-semibold tracking-tight text-ink">
          Let&rsquo;s get your store online
        </Text>
        <Text className="max-w-[280px] text-center text-[15px] font-medium text-ink/55">
          Takes about 5 minutes. You can always update these details later.
        </Text>
      </View>

      <PrimaryButton
        label="Get Started"
        onPress={handleGetStarted}
        loading={loading}
        trailingIcon={ArrowRight01Icon}
      />
    </View>
  );
}
