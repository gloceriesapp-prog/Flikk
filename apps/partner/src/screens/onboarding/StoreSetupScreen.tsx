// Step 1 of 3 in the Store Setup wizard — only reached when
// OtpVerificationScreen's verify response says has_store: false. Just the
// two fields that don't need a full-screen flow of their own (name,
// category); photo/location/GST live on StoreDetailsScreen next, and the
// actual submit happens on StoreReviewScreen after that — see
// navigation/types.ts's StoreDraft for how state threads across all three.
//
// "Resume where you left off": this is also the fixed entry point
// RootNavigator drops a returning has_store:false session at (see that
// file's own note), so on mount it fetches the saved draft
// (GET /partner/store-draft) and, if enough of it is already filled in,
// navigates straight past this screen (and even Step 2) instead of always
// restarting from a blank Step 1 — a phone-verified owner who closed the
// app mid-wizard picks up exactly where they stopped. Each step still
// saves its own fields (PUT /partner/store-draft) before advancing, so the
// draft is never more than one "Next" tap stale.

import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchStoreDraft, saveStoreDraft } from '../../api/auth';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StoreCategoryPicker } from '../store-settings/components/StoreCategoryPicker';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList, StoreDraft } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreSetup'>;

export function StoreSetupScreen({ navigation }: Props) {
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('');
  const [resuming, setResuming] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      try {
        const draft = await fetchStoreDraft();
        if (cancelled || !draft) return;

        if (draft.store_name) setStoreName(draft.store_name);
        if (draft.category) setCategory(draft.category);

        // Step 1 is only ever "done" once both fields are set — anything
        // less and this screen is still the right place to be.
        if (!draft.store_name || !draft.category) return;

        const partialDraft: StoreDraft = {
          storeName: draft.store_name,
          category: draft.category,
          district: draft.district,
          coordinates: draft.lat !== null && draft.lng !== null ? { latitude: draft.lat, longitude: draft.lng } : null,
          photoUrl: draft.photo_url,
          gstNumber: draft.gst_number ?? '',
        };

        // Step 2 also done (district set) -> skip straight to Review;
        // replace, not navigate, so the back button from either resumed
        // screen exits the wizard rather than landing on a blank step.
        if (draft.district) {
          navigation.replace('StoreReview', { draft: partialDraft });
        } else {
          navigation.replace('StoreDetails', { draft: partialDraft });
        }
      } catch {
        // No draft yet (brand new applicant) or a transient fetch failure
        // — either way, starting fresh on this screen is the safe default.
      } finally {
        if (!cancelled) setResuming(false);
      }
    }

    void resume();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const canContinue = storeName.trim().length > 0 && category.length > 0;

  async function handleNext() {
    if (!canContinue) return;
    const trimmedName = storeName.trim();

    setSaving(true);
    try {
      await saveStoreDraft({ storeName: trimmedName, category });
    } catch {
      // Best-effort — see this file's own note on why a failed save just
      // costs a resume, not a blocked flow.
    } finally {
      setSaving(false);
    }

    navigation.navigate('StoreDetails', {
      draft: {
        storeName: trimmedName,
        category,
        district: null,
        coordinates: null,
        photoUrl: null,
        gstNumber: '',
      },
    });
  }

  if (resuming) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    // Keyboard was covering the Next button below (no keyboard-avoidance
    // at all) — same fix/reasoning as LoginScreen.tsx's own note.
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white pb-safe pt-safe">
        <View className="px-6 pt-4">
          <Text className="text-xs font-bold uppercase tracking-wide text-lime-deep">Step 1 of 3</Text>
          <Text className="mt-1 text-3xl font-medium text-ink">Let’s get your store ready</Text>
          <Text className="mt-1 text-base font-medium text-ink/60">Tell us your store’s name and what it sells.</Text>
        </View>

        <View className="flex-1 gap-5 px-6 pt-6">
          <View className="gap-1.5">
            <Text className="text-base font-medium text-ink/60">Store name</Text>
            <TextInput
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Ganesh Kirana Store"
              placeholderTextColor="#9AA5A3"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base font-medium text-ink"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-base font-medium text-ink/60">Category</Text>
            <StoreCategoryPicker selected={category} onSelect={setCategory} />
          </View>
        </View>

        <View className="px-6 pb-4 pt-2">
          <PrimaryButton label="Next" onPress={handleNext} disabled={!canContinue} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
