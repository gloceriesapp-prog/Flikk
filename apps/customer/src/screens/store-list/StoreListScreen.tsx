// Reached from BottomNavBar's "Store" tab. Photo-banner header (StoreHeader)
// replaces the plain title; the bottom nav is hidden on this screen entirely
// so the banner is the only chrome — the store list scrolls under it.

import { ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StoreCard } from './components/StoreCard';
import { StoreHeader } from './components/StoreHeader';
import { STORE_LISTINGS } from './data';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Store'>;

export function StoreListScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-white">
      <StoreHeader onBack={() => navigation.goBack()} onSearch={() => navigation.navigate('Search')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <View className="gap-5 px-5 pt-6">
          {STORE_LISTINGS.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
