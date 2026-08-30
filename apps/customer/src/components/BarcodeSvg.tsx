// Real CODE128 barcode, actually scannable — but rendered with
// react-native-svg (already a dependency, already works in this app, see
// SvgUri usage in screens/checkout/components/PaymentMethodList.tsx)
// instead of react-native-barcode-builder, which renders through
// @react-native-community/art. ART is a legacy renderer Expo Go doesn't
// register (`View config not found for component 'ARTShape'` at runtime —
// confirmed crash, not a hypothetical), so that package never actually
// worked here. This uses jsbarcode's own CODE128 *encoder* directly (pure
// bit-string math, no DOM/canvas) and draws the bars ourselves.

import barcodes from 'jsbarcode/src/barcodes';
import Svg, { Rect } from 'react-native-svg';

interface Props {
  value: string;
  barWidth?: number;
  height?: number;
  color?: string;
}

interface BarSegment {
  x: number;
  width: number;
}

function computeBars(value: string, barWidth: number): BarSegment[] {
  const encoder = new barcodes.CODE128(value, {});
  if (!encoder.valid()) return [];
  const { data: binary } = encoder.encode();

  const bars: BarSegment[] = [];
  let runLength = 0;
  for (let i = 0; i <= binary.length; i++) {
    const bit = binary[i];
    if (bit === '1') {
      runLength++;
    } else if (runLength > 0) {
      bars.push({ x: (i - runLength) * barWidth, width: runLength * barWidth });
      runLength = 0;
    }
  }
  return bars;
}

export function BarcodeSvg({ value, barWidth = 2, height = 70, color = '#101C10' }: Props) {
  const bars = computeBars(value, barWidth);
  const naturalWidth = bars.length ? bars[bars.length - 1].x + bars[bars.length - 1].width : 0;

  return (
    // width="100%" + viewBox scales the bars down to fit whatever container
    // this sits in (a long URL encodes to more bars than any receipt card
    // is wide) — without this it renders at its natural pixel width and
    // bleeds straight off the card's edges.
    <Svg width="100%" height={height} viewBox={`0 0 ${naturalWidth} ${height}`} preserveAspectRatio="none">
      {bars.map((bar, i) => (
        <Rect key={i} x={bar.x} y={0} width={bar.width} height={height} fill={color} />
      ))}
    </Svg>
  );
}
