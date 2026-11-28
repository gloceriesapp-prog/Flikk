import { Text, View } from 'react-native';
import { TAG_HEIGHT } from '../layout';

// Rounded pill centred on the card's top edge, in the card's accent.
export function CardTag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View className="mt-1.5 items-center justify-center rounded-full px-2.5" style={{ height: TAG_HEIGHT, maxWidth: '94%', backgroundColor: bg }}>
      <Text numberOfLines={1} className="text-[12px] font-extrabold" style={{ color, lineHeight: TAG_HEIGHT, includeFontPadding: false }}>{label}</Text>
    </View>
  );
}
