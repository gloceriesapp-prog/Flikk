// Reached from BottomNavBar's "Store" tab. Photo-banner header (StoreHeader)
// replaces the plain title; the bottom nav is hidden on this screen entirely
// so the banner is the only chrome. Body is two sibling sections —
// TopStoresSection (horizontal highlight row) then AllStoresSection (the
// full vertical list) — each owning its own file/heading.

import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AllStoresSection } from './all-stores/AllStoresSection';
import { StoreHeader } from './components/StoreHeader';
import { TopStoresSection } from './top-stores/TopStoresSection';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Store'>;

export function StoreListScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-white">
      {/* Light (white) icons — correct against this screen's own full-bleed
          photo banner, same reasoning as HomeScreen.tsx's own dark header.
          Re-asserted here so a screen that set "dark" (Categories/Purchase)
          doesn't leave invisible dark icons behind on arrival — same fix
          class as those screens' own note, opposite value. */}
      <StatusBar style="light" />
      <StoreHeader onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <TopStoresSection />
        <AllStoresSection />
      </ScrollView>
    </View>
  );
}
