// Top-of-Home block: ETA, location, avatar, search. Everything below this is
// the future browse/discovery surface (PRD C3/C4) — not built yet.
//
// Background is a lime -> transparent vertical gradient over a white base,
// not a flat fill — strong lime at the very top, fading out by the time it
// reaches the search bar, so the search bar's white pill and the page below
// both read as "the same surface," not a hard color seam.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../theme/tokens';
import { EtaBadge } from './EtaBadge';
import { LocationSelector } from './LocationSelector';
import { ProfileAvatarButton } from './ProfileAvatarButton';
import { HomeSearchBar } from './HomeSearchBar';
import { CategoryTabs } from './CategoryTabs';

const PLACEHOLDER_ETA_MINUTES = 9; // real value should come from the nearest store's avg_prep_minutes

interface Props {
  onChangeLocation: () => void;
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export function HomeHeader({ onChangeLocation, selectedCategoryId, onSelectCategory }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View className="overflow-hidden rounded-b-[28px] bg-white">
      {/* LinearGradient isn't one of NativeWind's auto-patched components — a
          className here is silently ignored, so positioning must go through
          the real style prop or the gradient collapses to zero size. */}
      <LinearGradient
        colors={[colors.lime, `${colors.lime}00`]}
        locations={[0, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      <View className="pb-4 pt-safe">
        <View className="flex-row items-start justify-between px-6 pt-2">
          <View className="gap-1">
            <EtaBadge minutes={PLACEHOLDER_ETA_MINUTES} />
            <LocationSelector onPress={onChangeLocation} />
          </View>
          <ProfileAvatarButton />
        </View>

        <View className="px-6">
          <HomeSearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <CategoryTabs selectedId={selectedCategoryId} onSelect={onSelectCategory} />
      </View>
    </View>
  );
}
