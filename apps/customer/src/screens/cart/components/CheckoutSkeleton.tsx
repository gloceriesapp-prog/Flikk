import { StyleSheet, View } from 'react-native';

// Checkout's first load: address, items and bill appear together once the
// address, availability and quote are in, instead of the bill popping in
// under already-rendered items. Same static blocks as ScreenSkeleton.
export function CheckoutSkeleton({ rows }: { rows: number }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading checkout" accessibilityState={{ busy: true }} className="gap-3">
      <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
        <View style={[styles.block, styles.icon]} />
        <View className="flex-1 gap-2.5"><View style={[styles.block, styles.heading]} /><View style={[styles.block, styles.line]} /></View>
      </View>
      <View className="gap-4 rounded-2xl bg-white p-4">
        <View style={[styles.block, styles.heading]} />
        <View style={[styles.block, styles.shortLine]} />
        {Array.from({ length: Math.max(1, Math.min(rows, 4)) }, (_, index) => (
          <View key={index} className="flex-row items-center gap-3">
            <View style={[styles.block, styles.thumbnail]} />
            <View className="flex-1 gap-2.5"><View style={[styles.block, styles.line]} /><View style={[styles.block, styles.shortLine]} /></View>
          </View>
        ))}
      </View>
      <BillSkeleton />
    </View>
  );
}

// Holds the bill's place while a changed cart is re-priced.
export function BillSkeleton() {
  return (
    <View accessible accessibilityLabel="Checking current prices and fees" className="gap-3.5 rounded-2xl bg-white p-4">
      <View style={[styles.block, styles.heading]} />
      {[0, 1, 2].map((row) => (
        <View key={row} className="flex-row justify-between"><View style={[styles.block, styles.label]} /><View style={[styles.block, styles.amount]} /></View>
      ))}
    </View>
  );
}

export function TotalSkeleton() {
  return <View style={[styles.block, styles.total]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: '#ECEEF1', borderRadius: 8 },
  icon: { width: 40, height: 40, borderRadius: 12 },
  heading: { height: 16, width: '55%' },
  line: { height: 10, width: '85%' },
  shortLine: { height: 10, width: '40%' },
  thumbnail: { width: 56, height: 56, borderRadius: 12 },
  label: { height: 10, width: '35%' },
  amount: { height: 10, width: 56 },
  total: { height: 20, width: 96, marginTop: 4 },
});
