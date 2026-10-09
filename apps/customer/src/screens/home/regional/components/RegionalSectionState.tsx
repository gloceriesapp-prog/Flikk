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
  loadingLabel: string;
}

export function RegionalSectionState({ hasLocation, isLoading, isError, retry, emptyMessage, loadingLabel }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const action = !hasLocation ? () => navigation.navigate('SelectLocation') : isError ? retry : undefined;
  return (
    <View className="mx-5 items-center gap-3 rounded-2xl border border-ink/10 bg-white/75 px-5 py-6">
      {hasLocation && isLoading ? <BrowseLoadingText message={BROWSE_LOADING_COPY.regional} /> : (
        <>
          <Text className="text-center text-sm leading-5 text-ink/60">{!hasLocation ? 'Choose your delivery address to discover what’s available nearby.' : isError ? 'We couldn’t load nearby stock. Please try again.' : emptyMessage}</Text>
          {action && <Pressable accessibilityRole="button" onPress={action} className="min-h-11 justify-center rounded-full bg-primary px-5"><Text className="font-semibold text-white">{!hasLocation ? 'Choose location' : 'Try again'}</Text></Pressable>}
        </>
      )}
    </View>
  );
}
