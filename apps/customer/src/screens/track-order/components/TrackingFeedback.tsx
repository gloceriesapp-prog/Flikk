import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { TrackingState } from '../state/trackingState';
export function TrackingFeedback({ state, retry, busy, updatedAt = 0 }: {
    state: TrackingState;
    retry: () => void;
    busy: boolean;
    updatedAt?: number;
}) {
    if (state === 'loading')
        return <View className="flex-1 items-center justify-center"><ActivityIndicator /><Text className="mt-3 text-sm text-gray-500">Loading your order…</Text></View>;
    const stale = state === 'stale';
    const unavailable = state === 'unavailable';
    return <View className={stale ? 'mx-5 mt-3 rounded-2xl bg-white p-4' : 'flex-1 items-center justify-center px-8'} accessibilityLiveRegion="polite">
  <Text className="text-[16px] font-bold text-black">{stale ? 'Updates temporarily unavailable' : unavailable ? 'Order unavailable' : state === 'connection-error' ? 'Unable to connect' : 'Could not load tracking'}</Text>
  <Text className="mt-2 text-[13px] text-gray-600">{stale ? `Showing your last update${updatedAt ? ` at ${new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.` : unavailable ? 'This order could not be found or is no longer accessible.' : 'Check your connection and try again.'}</Text>
  <Pressable accessibilityRole="button" disabled={busy} onPress={retry} className="mt-3 rounded-xl bg-coral px-5 py-2.5"><Text className="font-semibold text-ink">{busy ? 'Retrying…' : 'Retry'}</Text></Pressable>
 </View>;
}
