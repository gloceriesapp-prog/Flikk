// Shown below the header whenever the store profile is missing something
// it genuinely needs to operate — store hours (customers/ops need to know
// when you're open) and a payout UPI ID (RazorpayX Payouts has nowhere to
// send the weekly settlement without one). Real logic, not a cosmetic
// checklist: computed from the same useStoreProfileStore profile every
// other screen reads, so it disappears the instant Settings actually
// saves the missing pieces — no separate "mark as done" flag to drift out
// of sync with reality.
//
// Doesn't hard-block anything (the Open/Closed toggle and order queue
// still work even with this showing) — it's a clear nudge with exactly
// what's missing named, not a wall. A shop owner who's already receiving
// orders through some other channel shouldn't be locked out of this app
// over an unset payout ID; they should just be told plainly so they fix
// it before the first payout cycle needs it.

import { Pressable, Text, View } from 'react-native';
import { AlertCircleIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import type { StoreProfile } from '../../store-settings/data';

const ACCENT = '#B45309';

export function getMissingProfileFields(profile: StoreProfile): string[] {
  const missing: string[] = [];
  if (!profile.openTime.trim() || !profile.closeTime.trim()) missing.push('store hours');
  if (!profile.payoutUpiId?.trim()) missing.push('payout UPI ID');
  return missing;
}

interface Props {
  profile: StoreProfile;
  onPress: () => void;
}

export function ProfileSetupBanner({ profile, onPress }: Props) {
  const missing = getMissingProfileFields(profile);
  if (missing.length === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      className="mx-5 mb-3 flex-row items-center gap-3 rounded-2xl bg-[#FDF2E9] px-4 py-3.5"
      style={({ pressed }) => ({ borderColor: `${ACCENT}30`, backgroundColor: `${ACCENT}0D`, opacity: pressed ? 0.8 : 1 })}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}1A` }}>
        <AppIcon icon={AlertCircleIcon} size={17} color={ACCENT} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold" style={{ color: ACCENT }}>
          Finish setting up your store
        </Text>
        <Text className="mt-0.5 text-[12.5px] font-medium" style={{ color: `${ACCENT}CC` }}>
          Add your {missing.join(' and ')} to start receiving orders.
        </Text>
      </View>
      <AppIcon icon={ArrowRight01Icon} size={16} color={ACCENT} />
    </Pressable>
  );
}
