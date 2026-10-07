import { Pressable, Text, View } from 'react-native';
import { BrowseLoadingText } from '../loading/BrowseLoadingText';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../../navigation/types';

export function ContentState({
  hasLocation = true,
  isLoading,
  isError,
  retry,
  emptyMessage = 'No available products nearby right now.',
  loadingMessage,
}: {
  hasLocation?: boolean;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  emptyMessage?: string;
  loadingMessage?: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const action = !hasLocation
    ? () => navigation.navigate('SelectLocation')
    : isError
      ? retry
      : undefined;
  return (
    <View className="mx-5 items-center gap-3 rounded-2xl border border-ink/10 px-5 py-6">
      {hasLocation && isLoading ? (
        <BrowseLoadingText message={loadingMessage} />
      ) : (
        <>
          <Text className="text-center text-sm text-ink/60">
            {!hasLocation
              ? 'Choose your delivery address to see what is available nearby.'
              : isError
                ? 'We couldn’t load this content. Please try again.'
                : emptyMessage}
          </Text>
          {action && (
            <Pressable
              accessibilityRole="button"
              onPress={action}
              className="min-h-11 justify-center rounded-full bg-coral px-5"
            >
              <Text className="text-sm font-semibold text-ink">
                {!hasLocation ? 'Choose location' : 'Try again'}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
