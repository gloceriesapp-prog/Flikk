import { Pressable, Text, View } from 'react-native';
import { GILROY } from '../../theme/fonts';

export function PreorderQuantitySelector({ count, minimum, canIncrease, unit, onChange }: {
  count: number; minimum: number; canIncrease: boolean; unit: string; onChange: (count: number) => void;
}) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginHorizontal: 20, paddingTop: 12 }}>
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: GILROY.semibold, fontSize: 14, color: '#101C10' }}>How much do you need?</Text>
      <Text style={{ fontFamily: GILROY.medium, fontSize: 12, color: '#6B7280', marginTop: 3 }}>
        {count} × {unit} · minimum {minimum}
      </Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#F3F6FF', borderWidth: 1, borderColor: '#D9E4FF' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease pre-order quantity" disabled={count <= minimum}
        onPress={() => onChange(count - 1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: count <= minimum ? 0.35 : 1 }}>
        <Text style={{ fontSize: 24, color: '#1447E6' }}>−</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={{ minWidth: 28, textAlign: 'center', fontFamily: GILROY.bold, fontSize: 16, color: '#1447E6' }}>{count}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Increase pre-order quantity" disabled={!canIncrease}
        onPress={() => onChange(count + 1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: canIncrease ? 1 : 0.35 }}>
        <Text style={{ fontSize: 24, color: '#1447E6' }}>+</Text>
      </Pressable>
    </View>
  </View>;
}
