import { BrowseLoadingText, BROWSE_LOADING_COPY } from '../../loading/BrowseLoadingText';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../../navigation/types';

interface Props {
  hasLocation: boolean;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  emptyMessage: string;
}

export function FreshSectionState({ hasLocation, isLoading, isError, retry, emptyMessage }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const action = !hasLocation ? () => navigation.navigate('SelectLocation') : isError ? retry : undefined;
  return (
    <View className="mx-5 items-center gap-3 rounded-2xl border border-ink/10 px-5 py-6">
      {hasLocation && isLoading ? <BrowseLoadingText message={BROWSE_LOADING_COPY.fresh} /> : (
        <>
          <Text className="text-center text-sm text-ink/60">{!hasLocation ? 'Choose your delivery address to discover fresh produce nearby.' : isError ? 'We couldn’t load these listings. Please try again.' : emptyMessage}</Text>
          {action && <Pressable accessibilityRole="button" onPress={action} className="min-h-11 justify-center rounded-full bg-[#155DFC] px-5"><Text className="font-semibold text-white">{!hasLocation ? 'Choose location' : 'Try again'}</Text></Pressable>}
        </>
      )}
    </View>
  );
}
