import { Text, View } from 'react-native';
import { TAG_HEIGHT } from '../layout';

// Tag attached to the card's top edge, centred, rounded bottom corners only.
export function CardTag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View className="items-center">
      <View className="justify-center rounded-b-[9px] px-2.5" style={{ height: TAG_HEIGHT, backgroundColor: bg }}>
        <Text numberOfLines={1} className="text-[10.5px] font-extrabold tracking-[0.1px]" style={{ color }}>{label}</Text>
      </View>
    </View>
  );
}
