// A lightweight STATIC route preview for a dispatch offer: store pin —
// dashed connector — drop pin, with the total trip distance as a centered
// pill. Deliberately NOT a map: it renders pure <View>s, zero
// react-native-maps surfaces. The old version mounted a full MapView per
// offer card, so 3-5 nearby offers meant 3-5 live Google map surfaces on the
// dashboard (mount stalls + memory). The live interactive map stays only
// where navigation needs it (DeliveryMapView, OrderDetailScreen final leg).
//
// Why a sketch and not a Google Static Maps image: the app has no
// REST-capable Maps key on the client (the Android key is Maps-SDK-restricted
// and never exposed to JS — see api/directions.ts, which proxies Directions
// server-side for exactly this reason) and there's no static-map backend
// proxy. A two-pin + distance schematic is the cheap, honest fallback; the
// per-leg distances/ETAs already live in OfferRouteStops just above this.

import { Text, View } from 'react-native';
import { Location01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { colors } from '../../../../theme/tokens';

interface Props {
  totalKm: number;
}

// One pin dot, matching OfferRouteStops' lime(pickup)/blue(drop) language.
function Pin({ kind }: { kind: 'pickup' | 'drop' }) {
  const isPickup = kind === 'pickup';
  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-full border-2 border-white"
      style={{ backgroundColor: isPickup ? colors.lime : '#3B82F6' }}
    >
      <AppIcon icon={isPickup ? Store01Icon : Location01Icon} size={16} color="#FFFFFF" />
    </View>
  );
}

export function OfferRoutePreview({ totalKm }: Props) {
  // Dashed connector drawn as a row of short segments — RN has no native
  // dashed border on a 1px line, and this stays a handful of cheap Views.
  const dashes = Array.from({ length: 10 });
  return (
    <View className="flex-row items-center rounded-2xl bg-mist px-4 py-4">
      <Pin kind="pickup" />
      <View className="flex-1 flex-row items-center justify-center gap-1.5 px-2">
        <View className="flex-1 flex-row items-center justify-evenly">
          {dashes.map((_, i) => (
            <View key={i} className="h-0.5 w-2 rounded-full" style={{ backgroundColor: '#101C1026' }} />
          ))}
        </View>
        <View className="rounded-full bg-white px-2.5 py-1">
          <Text className="text-[12px] font-bold tabular-nums text-ink">{totalKm.toFixed(1)} km</Text>
        </View>
        <View className="flex-1 flex-row items-center justify-evenly">
          {dashes.map((_, i) => (
            <View key={i} className="h-0.5 w-2 rounded-full" style={{ backgroundColor: '#101C1026' }} />
          ))}
        </View>
      </View>
      <Pin kind="drop" />
    </View>
  );
}
