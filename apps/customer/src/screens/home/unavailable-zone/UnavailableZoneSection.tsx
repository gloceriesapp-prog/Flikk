// Shown on Home's "All" tab in place of SeasonalSection/FestivalPicksSection/
// MostBoughtSection/NearbyStoresSection/StoreTypesSection when the user's
// picked delivery location falls outside Flikk's one active zone (see
// utils/serviceability.ts — single-zone-only per CLAUDE.md). Those sections
// all assume a real nearby store to browse; outside the zone there is none,
// so this replaces them rather than rendering next to them.

import { Text, View } from 'react-native';

// Reddish panel, no rounding on either edge — flush with the header above
// and CategorySections below, per an explicit ask (any rounding here read
// as a separate floating card rather than one continuous block flowing
// from the header straight into the rest of the page).
const PANEL_BG = '#F7DEDC';

export function UnavailableZoneSection() {
  return (
    <View className="items-center gap-4 px-5 py-12" style={{ backgroundColor: PANEL_BG }}>
      <View className="items-left gap-1.5">
        <Text className="text-left text-[18px] font-semibold text-ink">We&apos;re On Our Way.</Text>
        <Text className="text-left text-[14px] leading-5 text-ink/55">
         Gloceries app isn&apos;t in your area just yet. Upvote below and we&apos;ll prioritise expanding here next.
        </Text>
      </View>
    </View>
  );
}
