import Svg, { Circle } from 'react-native-svg';

// Exact vertical ellipsis supplied for address actions.
export function VerticalEllipsisIcon({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    <Circle cx={12} cy={12} r={1} />
    <Circle cx={12} cy={5} r={1} />
    <Circle cx={12} cy={19} r={1} />
  </Svg>;
}
