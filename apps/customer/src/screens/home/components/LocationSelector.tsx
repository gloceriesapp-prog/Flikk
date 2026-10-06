import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
// Reads the saved delivery address from useLocationStore (see
// src/screens/location/) and lets the user tap through to change it via the
// same LocationSearch screen used during onboarding. Two-line text stack —
// a small icon + "Delivering to" muted above the bold address + chevron.
// "Delivering to" reads clearer than the old "Deliver now" (which sat right
// above an address and read like a leftover CTA, not a label for what's
// below it). Shows the full reverse-geocoded line (addressLabel — same
// value LocationSearchScreen/geocoding.ts already resolve, just wasn't
// being displayed here before), same "Home - 123, Block A, Sector 5..."
// one-line-truncated pattern Blinkit/Instamart use in their own header —
// city alone doesn't tell a returning user *which* saved address is
// active when they have more than one in the same city.
//
// Dark text/icon — HomeHeader's background is a light pastel fill now
// (#E8E7FF), not the earlier dark gradient; the chevron was still hardcoded
// white from that era and read as invisible against the light bg.
//
// isClosed (10:30 PM–6:00 AM IST, utils/operatingHours.ts) swaps both
// lines: "Delivering to" becomes the reopen time (the actual answer to
// "when can I order" instead of a label that's momentarily false), and the
// address becomes a short, deliberate two-word closed statement instead of
// silently keeping the address visible as if ordering were still live.
// Location is still tappable/changeable underneath either way — this is
// just what the header SAYS while closed.

import { ChevronDownIcon, Navigation03Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { REOPEN_TIME_LABEL } from '../../../utils/operatingHours';
import { colors } from '../../../theme/tokens';
import { useLocationStore } from '../../../store/useLocationStore';

interface Props {
  onPress: () => void;
  isClosed?: boolean;
  // 'all' tab = light pastel header → dark text/icons; every other tab is a
  // dark gradient → white text/icons (HomeHeader.tsx's own note).
  light?: boolean;
}

export function LocationSelector({ onPress, isClosed = false, light = false }: Props) {
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const location = useLocationStore((s) => s.location);
  const label = location?.addressLabel || location?.city || 'Set your location';

  // On the light pastel 'all' header, text/icons are near-black; on every
  // dark-gradient tab they stay white.
  const primaryText = light ? 'text-black' : 'text-white';
  const iconColor = light ? '#101C10' : '#FFFFFF';
  const navColor = light ? 'rgba(16,28,16,0.6)' : 'rgba(255,255,255,0.6)';

  return (
    <Pressable onPress={onPress} className="max-w-[230px]">
      <View className="flex-row items-center gap-1">
        {/* Both icons hidden while closed — the send/navigation arrow
            implies "this is your live delivery point" and the chevron
            implies "tap to pick a different one right now", neither of
            which reads right next to a closed-hours statement. */}
        {/* {!isClosed && (
          <AppIcon icon={Navigation03Icon} size={12} color={navColor} fill={navColor} strokeWidth={0} />
        )} */}
        <Text className={`${isClosed ? 'text-[18px]' : 'text-2xl'} font-extrabold ${primaryText}`}>
          {isClosed ? `Opens ${REOPEN_TIME_LABEL} tomorrow` : `In ${estimatedMinutes} minutes`}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className={`text-lg font-semibold ${primaryText}`} numberOfLines={1}>
          {isClosed ? 'Closed for now' : label}
        </Text>
        {!isClosed && <AppIcon icon={ChevronDownIcon} size={16} color={iconColor} strokeWidth={2.2} />}
      </View>
    </Pressable>
  );
}
