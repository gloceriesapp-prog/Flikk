// Step 3 of 3 — read-only summary of everything StoreSetupScreen and
// StoreDetailsScreen collected, plus the actual submit. No field entry
// here on purpose: a shop owner reviewing what they're about to send for
// approval shouldn't be able to silently fat-finger a value on this
// screen — going back to the right step (via "Edit") is the only way to
// change something.
//
// Layout per an explicit reference wireframe: a profile-style header
// (circular store photo + store name + location beside it) instead of
// the photo/store/category/location all being separate card rows, then a
// plain flat list below for everything else — no icon badges, no card
// background, no dividers, just label-over-value rows. Every field in
// that list always renders, even ones the owner left blank (shown as
// "—" per an explicit ask) — a founder reviewing an approval later
// should see the whole shape of what was/wasn't provided, not have empty
// optional fields silently vanish.
//
// Phone number is shown too, even though nothing on this screen collects
// it — it's the account's own verified number (GET /auth/me), fetched
// once on mount purely for display. Read-only (no edit — phone changes
// require a fresh OTP verification, that's Login's job, not this
// screen's).
//
// Every "Edit" tap carries the full current draft as a param
// (navigation.navigate('StoreSetup'/'StoreDetails', { draft })) —
// StoreSetupScreen skips its own cold-start resume-fetch whenever a
// draft param is present (see that file's own note), which is what
// actually fixes edit taps previously getting silently redirected
// straight back here before you could type anything.

import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight01Icon, ImageAdd01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { checkAccountStatus, submitStoreApplication } from '../../api/auth';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { formatPhone } from '../../utils/formatPhone';
import { isValidPanFormat } from '../../utils/documentValidation';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'StoreReview'>;

const ACCENT = '#1754cf';
const EMPTY_VALUE = '—';

export function StoreReviewScreen({ navigation, route }: Props) {
  const { draft } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  // Not setHasStore — submitting no longer creates a real `stores` row
  // (backend's storeOnboarding.ts's own note), only admin's approve action
  // does. This is the "submitted, waiting on a decision" flag instead;
  // RootNavigator routes to WaitingApprovalScreen off it, not off hasStore.
  const setApplicationSubmitted = useAuthStore((s) => s.setApplicationSubmitted);
  const clearSession = useAuthStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;
    checkAccountStatus()
      .then(({ phone: accountPhone }) => {
        if (!cancelled) setPhone(accountPhone ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await submitStoreApplication({
        storeName: draft.storeName,
        category: draft.category,
        district: draft.district ?? 'Udupi',
        addressLine: draft.addressLine || undefined,
        gstNumber: draft.gstNumber || undefined,
        photoUrl: draft.photoUrl || undefined,
        ownerName: draft.ownerName || undefined,
        shopLicenseNumber: draft.shopLicenseNumber || undefined,
        fssaiNumber: draft.fssaiNumber || undefined,
        panNumber: draft.panNumber || undefined,
      });
      setApplicationSubmitted(true);
    } catch (err) {
      // A 401 here means the stored session token is stale or invalid —
      // e.g. a dev-mode token from before a real backend existed, now
      // being sent to a real one that never issued it. Retrying the same
      // submit would just 401 again forever; the only real fix is signing
      // in again, so clear the bad session and let RootNavigator drop the
      // owner back to Login on its own once accessToken goes null — not a
      // dead-end red error text with no way forward.
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
        <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
          Step 3 of 3
        </Text>
        <Text className="mt-1 text-[28px] font-bold text-ink">Review & submit</Text>
        <Text className="mt-1 text-[15px] font-medium text-ink/60">
          Double-check everything — we’ll review this before your store goes live.
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-1 px-6 pt-7">
        {/* Profile-style header — circular photo, store name + location
            beside it. Tapping either opens Step 1/2 to fix it, same as
            every other Edit below. */}
        <Pressable
          onPress={() => navigation.navigate('StoreSetup', { draft })}
          className="mb-6 flex-row items-center gap-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-[#F9FAFB]">
            {draft.photoUrl ? (
              <Image source={{ uri: draft.photoUrl }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <AppIcon icon={ImageAdd01Icon} size={20} color="#9AA5A3" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[18px] font-bold text-ink" numberOfLines={1}>
              {draft.storeName}
            </Text>
            <Text className="text-[14px] font-medium text-ink/50" numberOfLines={1}>
              {draft.district ?? EMPTY_VALUE}
            </Text>
          </View>
        </Pressable>

        <Row label="Owner name" value={draft.ownerName} onEdit={() => navigation.navigate('StoreSetup', { draft })} />
        <Row label="Category" value={draft.category} onEdit={() => navigation.navigate('StoreSetup', { draft })} />
        <Row label="Phone number" value={phone ? formatPhone(phone) : ''} />
        <Row label="PAN" value={draft.panNumber} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        <Row label="FSSAI license number" value={draft.fssaiNumber} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        <Row label="GSTIN" value={draft.gstNumber} onEdit={() => navigation.navigate('StoreDetails', { draft })} />
        <Row
          label="Shop & Establishment license"
          value={draft.shopLicenseNumber}
          onEdit={() => navigation.navigate('StoreDetails', { draft })}
        />

        {error && <Text className="mt-3 text-[13px] font-medium text-danger">{error}</Text>}
      </ScrollView>

      <View className="px-6 pb-4 pt-2">
        <PrimaryButton
          label="Submit for review"
          onPress={handleSubmit}
          loading={loading}
          disabled={!isValidPanFormat(draft.panNumber)}
          trailingIcon={ArrowRight01Icon}
        />
      </View>
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
  onEdit?: () => void;
}

function Row({ label, value, onEdit }: RowProps) {
  return (
    <View className="flex-row items-center justify-between border-b border-black/5 py-3.5">
      <View>
        <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
        <Text className="mt-0.5 text-[16px] font-semibold text-ink">{value.length > 0 ? value : EMPTY_VALUE}</Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={10}>
          <Text className="text-[13px] font-bold" style={{ color: ACCENT }}>
            Edit
          </Text>
        </Pressable>
      )}
    </View>
  );
}
