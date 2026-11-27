// White shape behind the picked Home category tab: rounded top corners, and
// at the foot the sides flare outwards in a smooth curve into the white page
// below. The first tab sits on the screen edge, so it has no left flare.
import Svg, { Path } from 'react-native-svg';

export const TAB_RADIUS = 14;
export const TAB_FLARE = 12;

export function selectedTabPath(width: number, height: number, flushLeft: boolean) {
  const r = TAB_RADIUS;
  const f = TAB_FLARE;
  const left = flushLeft ? 0 : f;
  const right = left + width;
  const start = flushLeft
    ? `M0 ${height} L0 ${r}`
    // Quarter-circle fillets: a true round inner corner, not a pinched curve.
    : `M0 ${height} A${f} ${f} 0 0 0 ${f} ${height - f} L${f} ${r}`;
  return `${start} Q${left} 0 ${left + r} 0 L${right - r} 0 Q${right} 0 ${right} ${r} `
    + `L${right} ${height - f} A${f} ${f} 0 0 0 ${right + f} ${height} Z`;
}

export function SelectedTabShape({ width, height, flushLeft }: { width: number; height: number; flushLeft: boolean }) {
  return (
    <Svg pointerEvents="none" width={width + TAB_FLARE + (flushLeft ? 0 : TAB_FLARE)} height={height}
      style={{ position: 'absolute', left: flushLeft ? 0 : -TAB_FLARE, bottom: 0 }}>
      <Path d={selectedTabPath(width, height, flushLeft)} fill="#FFFFFF" />
    </Svg>
  );
}
