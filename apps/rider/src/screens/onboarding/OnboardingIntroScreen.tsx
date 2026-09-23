// Page 1 of the rider onboarding wizard — no fields, just a "Set Up Profile"
// tap. That tap fetches any saved draft (GET /rider/draft) and resumes at
// the first step still missing its own required field, so a returning
// applicant never redoes a completed step. Reached only when a session is
// role='customer' (never applied, or a fresh reinstall) — RootNavigator's
// own fixed entry point for that state.
//
// Full-bleed hero image with a bottom gradient scrim: the copy + CTA sit
// over the image at the bottom, where the dark scrim keeps white text
// legible over whatever's in the photo (a fixed dark overlay would dull the
// whole image; a bottom-weighted gradient only darkens where text lands).

import { useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchRiderDraft } from '../../api/onboarding';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import type { AuthStackParamList, RiderDraft } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingIntro'>;

const HERO_IMAGE = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/rider.jpeg';

const EMPTY_DRAFT: RiderDraft = {
  fullName: '',
  dateOfBirth: '',
  profilePhotoUrl: null,
  houseNumber: '',
  street: '',
  landmark: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  aadhaarNumber: '',
  aadhaarPhotoUrl: null,
  dlNumber: '',
  dlPhotoUrl: null,
  vehicleType: null,
  vehicleNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

export function OnboardingIntroScreen({ navigation, route }: Props) {
  const editDraft = route.params?.draft;
  const rejectionReason = useAuthStore((s) => s.rejectionReason);
  const [loading, setLoading] = useState(false);

  async function handleGetStarted() {
    // Coming back in from a Review "Edit" tap — the draft is already in
    // hand, no need to re-fetch, just re-enter at the top of the wizard.
    if (editDraft) {
      navigation.navigate('PersonalDetails', { draft: editDraft });
      return;
    }

    setLoading(true);
    let draft = EMPTY_DRAFT;
    try {
      const saved = await fetchRiderDraft();
      if (saved) {
        draft = {
          fullName: saved.full_name ?? '',
          dateOfBirth: saved.date_of_birth ?? '',
          // Photo paths aren't returned by GET /rider/draft (private bucket) —
          // re-picked on resume like aadhaar/dl.
          profilePhotoUrl: null,
          // home_address is stored composed (one column) — it can't be
          // reliably split back into parts, so a resuming applicant
          // re-enters the structured address at the Personal step, same
          // way private-bucket photos are re-picked on resume.
          houseNumber: '',
          street: '',
          landmark: '',
          city: '',
          district: '',
          state: '',
          pincode: '',
          aadhaarNumber: saved.aadhaar_number ?? '',
          // Photo paths aren't returned by GET /rider/draft (private
          // bucket) — a resuming applicant re-picks them at the Identity
          // step, which is why that step still requires them.
          aadhaarPhotoUrl: null,
          dlNumber: saved.dl_number ?? '',
          dlPhotoUrl: null,
          vehicleType: saved.vehicle_type,
          vehicleNumber: saved.vehicle_number ?? '',
          emergencyContactName: saved.emergency_contact_name ?? '',
          emergencyContactPhone: saved.emergency_contact_phone ?? '',
          emergencyContactRelationship: saved.emergency_contact_relationship ?? '',
        };
      }
    } catch {
      // No draft yet or a transient failure — starting fresh is safe.
    } finally {
      setLoading(false);
    }

    // Resume at the first step whose own required field is still missing.
    if (!draft.fullName || !draft.dateOfBirth || !draft.pincode) {
      navigation.navigate('PersonalDetails', { draft });
    } else if (!draft.aadhaarNumber || !draft.dlNumber) {
      navigation.navigate('IdentityVerification', { draft });
    } else if (!draft.vehicleType) {
      navigation.navigate('VehicleDetails', { draft });
    } else if (!draft.emergencyContactName || !draft.emergencyContactPhone || !draft.emergencyContactRelationship) {
      navigation.navigate('EmergencyContact', { draft });
    } else {
      navigation.navigate('ReviewSubmit', { draft });
    }
  }

  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />
      <ImageBackground source={{ uri: HERO_IMAGE }} resizeMode="cover" className="flex-1">
        {/* Bottom-weighted scrim — transparent up top so the photo reads
            clean, deepening to near-solid ink behind the copy/CTA. */}
        <LinearGradient
          colors={['transparent', 'rgba(16,28,16,0.35)', 'rgba(16,28,16,0.92)']}
          locations={[0, 0.45, 0.82]}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-end px-6 pb-safe-offset-6 pt-safe-offset-8">
            <View className="mb-6 h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Text style={{ fontSize: 28 }}>🛵</Text>
            </View>

            <Text className="text-[34px] font-bold leading-[40px] tracking-tight text-white">Start earning{'\n'}with Gloceries</Text>
            <Text className="mt-3 max-w-[320px] text-[16px] font-medium leading-[22px] text-white/70">
              A few details, then you&rsquo;re ready for your first delivery.
            </Text>

            {rejectionReason && (
              <View className="mt-5 rounded-2xl border border-danger/40 bg-danger/20 px-4 py-3">
                <Text className="text-[13px] font-bold text-white">Your last application needs changes</Text>
                <Text className="mt-1 text-[13px] font-medium text-white/80">{rejectionReason}</Text>
              </View>
            )}

            {/* White CTA rather than the shared ink PrimaryButton — an ink
                button would sink into the dark scrim; white pops off the
                hero and keeps AA contrast with its ink label. */}
            <Pressable
              onPress={handleGetStarted}
              disabled={loading}
              className="mt-8 h-[54px] flex-row items-center justify-center gap-2 rounded-full bg-white"
              style={({ pressed }) => ({ opacity: pressed || loading ? 0.9 : 1 })}
            >
              {loading ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <>
                  <Text className="text-[16px] font-semibold text-ink">Set Up Profile</Text>
                  <AppIcon icon={ArrowRight01Icon} size={17} color={colors.ink} strokeWidth={2.2} />
                </>
              )}
            </Pressable>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}
