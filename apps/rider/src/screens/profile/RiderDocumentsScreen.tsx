// Rider Documents shows approved details and offers reviewed update requests.
// The details below are everything the rider submitted
// at onboarding and that admin approved: profile photo, personal details,
// identity (masked Aadhaar + DL, plus the actual scan images), vehicle,
// emergency contact, and payout destination. All from GET /rider/profile
// (useRiderProfile) — the same masked shape the profile screen uses.
//
// The raw Aadhaar/DL scan images live in the PRIVATE rider-documents bucket;
// /rider/profile signs short-lived URLs for them (aadhaarPhotoUrl/dlPhotoUrl),
// same as the profile photo. Null url (no scan on file) -> the image row is
// simply omitted, numbers still show.

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage as Image } from '../../components/AppImage';
import type { ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderProfile } from './useRiderProfile';
import { useAuthStore } from '../../store/useAuthStore';
import { RiderProfileChangeForm } from './RiderProfileChangeForm';
import type { RiderProfile } from '../../api/profile';

const CARD_BORDER = '#EAECEE';

const VEHICLE_LABEL: Record<NonNullable<RiderProfile['vehicleType']>, string> = {
  bicycle: 'Bicycle',
  scooter: 'Scooter',
  motorcycle: 'Bike',
};

// Hand-formatted (no Intl — Hermes ships without full ICU); '' passthrough.
function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${months[Number(m) - 1] ?? m} ${y}`;
}

export function RiderDocumentsScreen() {
  const navigation = useNavigation();
  const phone = useAuthStore((state) => state.phone);
  const { data: profile, isLoading } = useRiderProfile();

  if (isLoading && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.limeDeep} />
      </View>
    );
  }

  const vehicle = profile?.vehicleType
    ? `${VEHICLE_LABEL[profile.vehicleType]}${profile.vehicleNumber ? ` · ${profile.vehicleNumber}` : ''}`
    : null;

  const payout = profile?.payout;
  const payoutValue =
    payout?.method === 'upi'
      ? payout.upiId
      : payout?.method === 'bank_account'
        ? [payout.bankName, payout.maskedAccountNumber].filter(Boolean).join(' · ')
        : null;

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-safe-offset-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-9 w-9 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-[18px] font-bold text-ink">Your documents</Text>
      </View>

      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-2" showsVerticalScrollIndicator={false}>
        {profile?.photoUrl && (
          <View className="items-center">
            <Image source={{ uri: profile.photoUrl }} className="h-24 w-24 rounded-full" resizeMode="cover" />
            <Text className="mt-2 text-[13px] font-semibold text-ink/50">Profile photo</Text>
          </View>
        )}

        <Section title="Personal">
          <Field label="Full name" value={profile?.name} />
          <Field label="Date of birth" value={formatDate(profile?.dateOfBirth ?? null)} />
          <Field label="Home address" value={profile?.homeAddress} last />
        </Section>

        <Section title="Identity">
          <Field label="Aadhaar number" value={profile?.aadhaarMasked} verified />
          <DocImage label="Aadhaar scan" uri={profile?.aadhaarPhotoUrl} />
          <Field label="Driving licence" value={profile?.dlNumber} verified />
          <DocImage label="Licence scan" uri={profile?.dlPhotoUrl} last />
        </Section>

        <Section title="Vehicle">
          <Field label="Vehicle" value={vehicle} last />
        </Section>

        <Section title="Emergency contact">
          <Field label="Name" value={profile?.emergencyContactName} />
          <Field label="Phone" value={profile?.emergencyContactPhone} />
          <Field label="Relationship" value={profile?.emergencyContactRelationship} last />
        </Section>

        {profile && <RiderProfileChangeForm key={phone} profile={profile} />}

        <Section title="Payout">
          <Field label={payout?.method === 'upi' ? 'UPI' : 'Bank account'} value={payoutValue} last />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-0.5 rounded-2xl border px-4 py-2" style={{ borderColor: CARD_BORDER }}>
      <Text className="pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink/40">{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, value, verified, last }: { label: string; value?: string | null; verified?: boolean; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between gap-3 py-3 ${last ? '' : 'border-b border-black/5'}`}>
      <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1.5">
        <Text
          className="text-right text-[14px] font-semibold text-ink"
          numberOfLines={2}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value && value.length > 0 ? value : '—'}
        </Text>
        {verified && value ? <AppIcon icon={CheckmarkCircle02Icon} size={15} color={colors.success} /> : null}
      </View>
    </View>
  );
}

// The actual ID scan (signed URL). Omitted entirely when no scan is on file
// (uri null) — the number Field above already stands on its own.
function DocImage({ label, uri, last }: { label: string; uri?: string | null; last?: boolean }) {
  if (!uri) return null;
  return (
    <View className={`gap-2 py-3 ${last ? '' : 'border-b border-black/5'}`}>
      <Text className="text-[13px] font-medium text-ink/45">{label}</Text>
      <Image source={{ uri }} className="h-44 w-full rounded-xl bg-black/5" resizeMode="cover" />
    </View>
  );
}
