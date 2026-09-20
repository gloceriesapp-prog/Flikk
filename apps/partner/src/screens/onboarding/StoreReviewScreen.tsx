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
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { submitStoreApplication } from '../../api/auth';
import { ApiError } from '../../api/client';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import { isValidPanFormat } from '../../utils/documentValidation';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreReview'>;

const EMPTY_VALUE = '—';

export function StoreReviewScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setApplicationSubmitted = useAuthStore((s) => s.setApplicationSubmitted);
  const clearSession = useAuthStore((s) => s.clear);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await submitStoreApplication({
        storeName: draft.storeName,
        category: draft.category,
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
        openTime: draft.openTime || undefined,
        closeTime: draft.closeTime || undefined,
      });
      setApplicationSubmitted(true);
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
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <View className="px-6 pt-4">
        <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: colors.limeDeep }}>
          Review & submit
        </Text>
        <Text className="mt-1 text-[28px] font-bold text-ink">{draft.storeName || 'Your store'}</Text>
        <Text className="mt-1 text-[15px] font-medium text-ink/60">
          Double-check everything — we&rsquo;ll review this before your store goes live.
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
        <Row label="GSTIN" value={draft.gstNumber} onEdit={() => navigation.navigate('BusinessDocuments', { draft })} />
        <Row label="Udyam number" value={draft.udyamNumber} onEdit={() => navigation.navigate('BusinessDocuments', { draft })} />

        <SectionLabel label="Hours" />
        <Row
          label="Opening hours"
          value={draft.openTime && draft.closeTime ? `${draft.openTime} – ${draft.closeTime}` : ''}
          onEdit={() => navigation.navigate('StoreHours', { draft })}
        />

        {error && <Text className="mt-3 text-[13px] font-medium text-danger">{error}</Text>}
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton
          label="Start Selling on Gloceries"
          onPress={handleSubmit}
          loading={loading}
          disabled={!isValidPanFormat(draft.panNumber)}
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

function Row({ label, value, onEdit }: RowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-black/5 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
        <Text className="mt-0.5 text-[16px] font-semibold text-ink" numberOfLines={2}>
          {value.length > 0 ? value : EMPTY_VALUE}
        </Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={10} className="rounded-full border border-black/10 px-3 py-1.5">
          <Text className="text-[13px] font-bold" style={{ color: colors.limeDeep }}>
            Edit
          </Text>
        </Pressable>
      )}
    </View>
  );
}
