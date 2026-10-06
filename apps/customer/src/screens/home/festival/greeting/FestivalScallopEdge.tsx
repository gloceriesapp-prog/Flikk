// Decorative scalloped bottom trim for the festival panel — the blue panel
// ends in a row of rounded blue bumps hanging down onto the white page, with a
// small white dot riding each bump (festival lace/doily look).
//
// ponytail: circles-as-scallops, not SVG. The band bg IS the white page color.
// A flex-row of solid `color` (blue) circles is pulled up by top:-D/2 so each
// circle's TOP half sits over the blue panel above (blue-on-blue, invisible)
// and its BOTTOM half shows as a blue bump on the white band. No SVG path, no
// tiling math beyond a circle count — RN Views only.
import { useWindowDimensions, View } from 'react-native';

const D = 22; // circle diameter — bump size
const DOT = 4; // white lace dot

interface Props {
  color: string; // panel blue — same as the bg above, so top halves vanish
  dotColor?: string;
}

// How many bumps span a given width.
export function scallopCount(width: number) {
  return Math.ceil(width / D);
}

export function FestivalScallopEdge({ color, dotColor = '#FFFFFF' }: Props) {
  const { width } = useWindowDimensions();
  const count = scallopCount(width);

  return (
    // White band = the page below. Height = bottom half of a bump.
    <View style={{ height: D / 2, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
      <View className="flex-row" style={{ marginTop: -D / 2 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View
            key={i}
            style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: color }}
            className="items-center justify-center"
          >
            {/* white lace dot sits on the visible (lower) half of the bump */}
            <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: dotColor, marginTop: D / 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

// self-check: geometry math holds for a sample width
if (__DEV__) {
  console.assert(scallopCount(360) === Math.ceil(360 / 22), 'scallopCount 360px wrong');
  console.assert(scallopCount(0) === 0, 'scallopCount 0px should be 0');
}
