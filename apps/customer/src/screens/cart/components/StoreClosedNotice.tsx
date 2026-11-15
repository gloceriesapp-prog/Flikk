import { Text, View } from 'react-native';

export function StoreClosedNotice({ reopeningMessage }: { reopeningMessage?: string }) {
  const reopening = reopeningMessage?.replace(/^Ordering is closed\.\s*/, '');
  return (
    <View accessibilityRole="summary" className="gap-1.5 rounded-2xl border border-mist bg-white px-4 py-3.5">
      <Text className="text-[17px] font-semibold leading-6 text-[#B42318]">{reopening ? `Store is closed. ${reopening}` : 'Store is closed'}</Text>
      <Text className="text-[14px] font-medium leading-[21px] text-ink/60">Your cart is saved. You can keep adding items and place your order when the store reopens.</Text>
    </View>
  );
}
