import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';
import { SectionTitle } from '../../components/SectionTitle';
import { ContentState } from '../../content/ContentState';
import { FestivalStoreCard } from './FestivalStoreCard';
import { useFestivalShops } from './useFestivalShops';

export function FromLocalShopsSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { stores, hasLocation, isLoading, isError, retry } = useFestivalShops();
  return (
    <View className="pt-8">
      <SectionTitle>From local shops</SectionTitle>
      {stores.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, alignItems: 'flex-start' }} snapToInterval={236} snapToAlignment="start" decelerationRate="fast">
          {stores.map((store) => <FestivalStoreCard key={store.id} store={store} onPress={() => navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name })} />)}
        </ScrollView>
      ) : (
        <ContentState hasLocation={hasLocation} isLoading={isLoading} isError={isError} retry={retry} emptyMessage="No festival shops listed nearby yet." />
      )}
    </View>
  );
}
