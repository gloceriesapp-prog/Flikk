import { StyleSheet, View } from 'react-native';

export type SkeletonLayout = 'products' | 'list' | 'categories' | 'tracking' | 'map' | 'line';

/** Geometry only: no timers, image downloads or JS animation loop on the loading path.
 * Mount only when content is absent; cached content stays visible during refresh.
 */
export function ScreenSkeleton({ layout = 'products', rows = 2, columns = 3, label = 'Loading content' }: {
  layout?: SkeletonLayout;
  rows?: number;
  columns?: 2 | 3;
  label?: string;
}) {
  const count = Math.max(1, Math.min(rows, 4));
  return <View testID={`skeleton-${layout}`} accessible accessibilityRole="progressbar"
    accessibilityLabel={label} accessibilityState={{ busy: true }} style={styles.root}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
      {layout === 'line' ? <View style={[styles.block, styles.line]} />
        : layout === 'map' ? <View style={[styles.block, styles.map]} />
        : layout === 'tracking' ? <>
          <View style={[styles.block, styles.heading]} /><View style={[styles.block, styles.line]} />
          <View style={[styles.block, styles.map]} />
          <View style={[styles.block, styles.listCard]} />
        </> : Array.from({ length: count }, (_, row) => (
          <View key={row} style={styles.row}>
            {layout === 'list' ? <View style={styles.listRow}>
              <View style={[styles.block, styles.thumbnail]} />
              <View style={styles.details}><View style={[styles.block, styles.heading]} />
                <View style={[styles.block, styles.line]} /><View style={[styles.block, styles.shortLine]} /></View>
            </View> : Array.from({ length: layout === 'categories' ? 5 : columns }, (_, column) => (
              <View key={column} style={styles.card}>
                <View style={[styles.block, layout === 'categories' ? styles.category : styles.image]} />
                <View style={[styles.block, styles.line]} />
                {layout === 'products' && <View style={[styles.block, styles.shortLine]} />}
              </View>
            ))}
          </View>
        ))}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { width: '100%', paddingVertical: 12 },
  content: { gap: 20 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, minWidth: 0, gap: 10 },
  block: { backgroundColor: '#ECEEF1', borderRadius: 8 },
  image: { width: '100%', aspectRatio: 0.9, borderRadius: 14 },
  category: { width: '100%', aspectRatio: 1, borderRadius: 14 },
  line: { height: 10, width: '85%' },
  shortLine: { height: 10, width: '50%' },
  heading: { height: 16, width: '70%' },
  thumbnail: { width: 72, height: 76, borderRadius: 14 },
  details: { flex: 1, gap: 12, justifyContent: 'center' },
  listRow: { flex: 1, flexDirection: 'row', gap: 16, paddingVertical: 10 },
  listCard: { height: 84, width: '100%', borderRadius: 16 },
  map: { height: 200, width: '100%', borderRadius: 20 },
});
