import { Text, View } from 'react-native';

// Parent reserves 8px below its border so the label never overlaps the next row.
export function StockBorderLabel({ label, align = 'center' }: { label: string; align?: 'center' | 'start' }) {
  if (!label) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 8, right: 8, alignItems: align === 'start' ? 'flex-start' : 'center' }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}
        className="rounded-full bg-white px-2 text-center text-[11px] font-semibold leading-[16px]"
        style={{ color: '#8A8F98' }}>{label}</Text>
    </View>
  );
}
