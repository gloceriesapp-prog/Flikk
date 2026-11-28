import { Text, View } from 'react-native';

// Rounded pill centred on the card's top edge, in the card's accent.
export function CardTag({ label, bg, color, height }: { label: string; bg: string; color: string; height: number }) {
  return (
    <View className="items-center justify-center overflow-hidden rounded-full px-2" style={{ height, maxWidth: '100%', backgroundColor: bg }}>
      <Text numberOfLines={1} className="font-extrabold" style={{ color, fontSize: Math.min(10.5, height * 0.525), lineHeight: height, includeFontPadding: false }}>{label}</Text>
    </View>
  );
}
