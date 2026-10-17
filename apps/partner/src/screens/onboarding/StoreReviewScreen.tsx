import { getSessionEpoch, isCurrentSession } from '../../store/sessionScope';
import { flushStoreDraftSaves } from '../../onboarding/draftAutosave';
// Final step — read-only summary of every field the 5-step wizard
// collected, plus the actual submit. No field entry here on purpose: a shop
// owner reviewing what they're about to send for approval shouldn't be able
// to silently fat-finger a value on this screen — tapping "Edit" (which
// routes back to the exact step that owns the field) is the only way to
// change something. Every field always renders, even ones left blank (shown
// as "—") — a founder reviewing an approval later should see the whole
// shape of what was/wasn't provided.

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { submitStoreApplication } from '../../api/auth';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import { isValidFssaiFormat, isValidPanFormat } from '../../utils/documentValidation';
import { categoryNeedsFssai, useStoreCategories } from '../store-settings/components/StoreCategoryPicker';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreReview'>;

const EMPTY_VALUE = '—';

export function StoreReviewScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setApplicationSubmitted = useAuthStore((s) => s.setApplicationSubmitted);
  const clearSession = useAuthStore((s) => s.clear);
  const categories = useStoreCategories();
  const needsFssai = categoryNeedsFssai(categories, draft.category);

  const coordinates = draft.coordinates;
  const validCoordinates = !!coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude) && Math.abs(coordinates.latitude) <= 90 && Math.abs(coordinates.longitude) <= 180;

  async function submitApplication() {
    if (!validCoordinates) throw new Error("Choose your store location on the map before submitting.");
    const epoch = getSessionEpoch();
    // Drain old draft writes so they cannot overwrite the final submission.
    await flushStoreDraftSaves();
    if (!isCurrentSession(epoch)) throw new ApiError(0, 'SESSION_CHANGED', 'Your account changed. Please sign in again.');
    await submitStoreApplication({
      storeName: draft.storeName,
      category: draft.category,
      lat: coordinates!.latitude,
      lng: coordinates!.longitude,
      phone: draft.phone || undefined,
      district: draft.district ?? 'Udupi',
      addressLine: draft.addressLine || undefined,
      manualAddress: draft.manualAddress || undefined,
      gstNumber: draft.gstNumber || undefined,
      ownerName: draft.ownerName || undefined,
      ownerEmail: draft.ownerEmail || undefined,
      shopLicenseNumber: draft.shopLicenseNumber || undefined,
      fssaiNumber: draft.fssaiNumber || undefined,
      panNumber: draft.panNumber || undefined,
      udyamNumber: draft.udyamNumber || undefined,
      drugLicenseNumber: draft.drugLicenseNumber || undefined,
      openTime: draft.openTime || undefined,
      closeTime: draft.closeTime || undefined,
      profilePhotoPath: draft.profilePhotoPath || undefined,
      storePhotoPath: draft.storePhotoPath || undefined,
    });
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      try {
        await submitApplication();
      } catch (err) {
        // The shared client already retries a 429 honoring Retry-After; a
        // 429 surfacing here means it's still rate-limited. Don't dead-end
        // the user on a raw "try again" — show a friendly note and auto-retry
        // once more after a short backoff. A second failure falls through to
        // the outer catch.
        if (err instanceof ApiError && err.status === 429) {
          setError('You’re going a bit fast — retrying in a moment…');
          await new Promise((resolve) => setTimeout(resolve, 2500));
          await submitApplication();
        } else {
          throw err;
        }
      }
      setApplicationSubmitted(true);
      setError(null);
    } catch (err) {
      // A 401 here means the stored session token is stale/invalid — the
      // only real fix is signing in again, so clear the bad session and let
      // RootNavigator drop the owner back to Login on its own.
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Taking you back to log in…');
        setTimeout(() => {
          void clearSession();
        }, 1500);
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        setError('Still busy right now — please wait a moment and tap again.');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <View className="px-6 pt-4">
        <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
          Review & submit
        </Text>
        <Text className="mt-1 text-[28px] font-bold text-ink">{draft.storeName || 'Your store'}</Text>
        <Text className="mt-1 text-[15px] font-medium text-ink/60">
          Double check everything, we&rsquo;ll review this before your store goes live.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-1 px-6 pt-7">
        <SectionLabel label="Store" />
        <Row label="Store name" value={draft.storeName} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        <Row label="Category" value={draft.category} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        <Row label="Store phone" value={draft.phone} onEdit={() => navigation.navigate('StoreDetails', { draft })} />

        <SectionLabel label="Location" />
        <Row
          label="Complete address"
          value={draft.addressLine ?? ''}
          onEdit={() => navigation.navigate('StoreLocation', { draft })}
        />
        <Row label="District" value={draft.district ?? ''} onEdit={() => navigation.navigate('StoreLocation', { draft })} />

        <SectionLabel label="Owner" />
        <Row label="Owner name" value={draft.ownerName} onEdit={() => navigation.navigate('OwnerDetails', { draft })} />
        <Row label="Email" value={draft.ownerEmail} onEdit={() => navigation.navigate('OwnerDetails', { draft })} />

        <SectionLabel label="Documents" />
        <Row label="PAN" value={draft.panNumber} onEdit={() => navigation.navigate('BusinessDocuments', { draft })} />
        {needsFssai && (
          <Row label="FSSAI number" value={draft.fssaiNumber} onEdit={() => navigation.navigate('BusinessDocuments', { draft })} />
        )}
        <Row label="GSTIN" value={draft.gstNumber} onEdit={() => navigation.navigate('BusinessDocuments', { draft })} />
        <Row label="Udyam number" value={draft.udyamNumber} onEdit={() => navigation.navigate('BusinessDocuments', { draft })} />
        {draft.category === 'Pharmacy' && (
          <Row label="Drug licence number" value={draft.drugLicenseNumber} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        )}

        <SectionLabel label="Hours" />
        <Row
          label="Opening hours"
          value={draft.openTime && draft.closeTime ? `${draft.openTime} – ${draft.closeTime}` : ''}
          onEdit={() => navigation.navigate('StoreHours', { draft })}
        />

        <SectionLabel label="Verification photos" />
        <PhotoStatusRow label="Store photo" uploaded={!!draft.storePhotoPath} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        <PhotoStatusRow label="Owner photo" uploaded={!!draft.profilePhotoPath} onEdit={() => navigation.navigate('OwnerDetails', { draft })} />

        {error && <Text className="mt-3 text-[13px] font-medium text-danger">{error}</Text>}
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton
          label="Start Selling on Gloceries"
          onPress={handleSubmit}
          loading={loading}
          disabled={!isValidPanFormat(draft.panNumber) || (needsFssai && !isValidFssaiFormat(draft.fssaiNumber)) || !draft.storePhotoPath || !validCoordinates}
          trailingIcon={ArrowRight01Icon}
        />
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text className="mb-1 mt-4 text-[12px] font-bold uppercase tracking-wide text-ink/35 first:mt-0">{label}</Text>;
}

interface RowProps {
  label: string;
  value: string;
  onEdit?: () => void;
}

function Row({ label, value, onEdit }: RowProps) {  return (
    <View className="flex-row items-center justify-between border-b border-black/5 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
        <Text className="mt-0.5 text-[16px] font-semibold text-ink" numberOfLines={2}>
          {value.length > 0 ? value : EMPTY_VALUE}
        </Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={10} className="rounded-full border border-black/10 px-3 py-1.5">
          <Text className="text-[13px] font-bold" style={{ color: colors.primary }}>
            Edit
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Encrypted KYC photos can't be previewed inline — just a status + Edit that
// routes back to the step that owns the upload.
function PhotoStatusRow({ label, uploaded, onEdit }: { label: string; uploaded: boolean; onEdit: () => void }) {
  return (
    <View className="flex-row items-center justify-between border-b border-black/5 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          {uploaded && <AppIcon icon={CheckmarkCircle02Icon} size={15} color={colors.success} />}
          <Text className="text-[16px] font-semibold" style={{ color: uploaded ? colors.success : colors.ink + '70' }}>
            {uploaded ? 'Uploaded' : 'Not added'}
          </Text>
        </View>
      </View>
      <Pressable onPress={onEdit} hitSlop={10} className="rounded-full border border-black/10 px-3 py-1.5">
        <Text className="text-[13px] font-bold" style={{ color: colors.primary }}>
          Edit
        </Text>
      </Pressable>
    </View>
  );
}
