import { Text, View } from 'react-native';
import { TAG_HEIGHT } from '../layout';

// Offer strip across the foot of the card, in the card's accent.
export function CardTag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View className="w-full items-center justify-center px-1.5" style={{ height: TAG_HEIGHT, backgroundColor: bg }}>
      <Text numberOfLines={1} className="text-[12px] font-bold" style={{ color, lineHeight: TAG_HEIGHT, includeFontPadding: false }}>{label}</Text>
    </View>
  );
}
