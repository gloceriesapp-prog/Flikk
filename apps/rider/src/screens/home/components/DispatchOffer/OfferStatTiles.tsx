// The three-up stat tiles on a dispatch offer: total distance, rough total
// time, est. earning. Total distance/time are the whole rider→store→drop
// job; earning is the real (trip-aware) payout. Time is a straight-line
// estimate (etaMinutes), labelled "Est." so it never reads as a promise.

import { Clock01Icon, MoneyBag02Icon, Route01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import type { IconSvgElement } from '@hugeicons/react-native';
import { colors } from '../../../../theme/tokens';
import { etaMinutes } from '../../../../utils/geo';

// Dark inline card vs. white bottom sheet: tiles swap fill + text colors,
// and the earning tile gets a lime-tinted highlight on light (the money is
// the reason to accept — worth drawing the eye on the premium surface).
type Tone = 'onDark' | 'onLight';
const TONE = {
  onDark: { tile: '#FFFFFF0D', icon: '#FFFFFFB3', value: 'text-white', label: 'text-white/45', earnTile: '#FFFFFF0D' },
  onLight: { tile: '#F1F2F4', icon: '#101C10B3', value: 'text-ink', label: 'text-ink/45', earnTile: colors.limeSoft },
} as const;

function Tile({ icon, value, label, tone, highlight }: { icon: IconSvgElement; value: string; label: string; tone: Tone; highlight?: boolean }) {
  const t = TONE[tone];
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl py-3" style={{ backgroundColor: highlight ? t.earnTile : t.tile }}>
      <AppIcon icon={icon} size={18} color={t.icon} />
      <Text className={`text-[15px] font-bold ${t.value}`} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className={`text-[11px] font-medium ${t.label}`}>{label}</Text>
    </View>
  );
}

interface Props {
  totalKm: number;
  payout: number;
  tone?: Tone;
}

export function OfferStatTiles({ totalKm, payout, tone = 'onDark' }: Props) {
  return (
    <View className="flex-row gap-2.5">
      <Tile icon={Route01Icon} value={`${totalKm.toFixed(1)} km`} label="Total distance" tone={tone} />
      <Tile icon={Clock01Icon} value={`${etaMinutes(totalKm)} min`} label="Est. time" tone={tone} />
      <Tile icon={MoneyBag02Icon} value={`₹${payout}`} label="Est. earning" tone={tone} highlight />
    </View>
  );
}
