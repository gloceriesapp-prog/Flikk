// The pickup → drop route block on a dispatch offer: two labelled stops
// (store then drop) joined by a connector line, each with its own leg
// distance and rough ETA. All real order data — store name + the RPC's
// rider→store distance for pickup, the drop label + straight-line
// store→drop distance for the drop.

import { Location01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { colors } from '../../../../theme/tokens';
import { etaMinutes } from '../../../../utils/geo';

// Two surfaces use these stops now: the dark inline offer card ('onDark') and
// the premium white bottom sheet ('onLight'). Only text/connector colors
// differ — the pins stay lime/blue on both.
type Tone = 'onDark' | 'onLight';
const TONE = {
  onDark: { title: 'text-white', sub: 'text-white/50', connector: '#FFFFFF22' },
  onLight: { title: 'text-ink', sub: 'text-ink/50', connector: '#101C1022' },
} as const;

interface Stop {
  kind: 'pickup' | 'drop';
  title: string;
  km: number;
  tone: Tone;
}

function StopRow({ kind, title, km, tone }: Stop) {
  const isPickup = kind === 'pickup';
  const t = TONE[tone];
  return (
    <View className="flex-row items-center gap-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isPickup ? colors.lime : '#3B82F6' }}
      >
        <AppIcon icon={isPickup ? Store01Icon : Location01Icon} size={16} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-bold ${t.title}`} numberOfLines={1}>
          {title}
        </Text>
        <Text className={`text-[12px] font-medium ${t.sub}`}>
          {isPickup ? 'Pickup' : 'Drop'} · {km.toFixed(1)} km ({etaMinutes(km)} min)
        </Text>
      </View>
    </View>
  );
}

interface Props {
  storeName: string;
  pickupKm: number;
  dropLabel: string;
  dropKm: number;
  tone?: Tone;
}

export function OfferRouteStops({ storeName, pickupKm, dropLabel, dropKm, tone = 'onDark' }: Props) {
  return (
    <View className="gap-3">
      <StopRow kind="pickup" title={storeName} km={pickupKm} tone={tone} />
      {/* Connector — a short dashed segment aligned under the pin center. */}
      <View className="ml-[17px] h-3 w-px" style={{ backgroundColor: TONE[tone].connector }} />
      <StopRow kind="drop" title={dropLabel} km={dropKm} tone={tone} />
    </View>
  );
}
