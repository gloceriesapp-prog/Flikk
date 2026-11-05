// Iconly share (box with an outgoing arrow) as RN svg; viewBox 0 0 24 24.
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export function IconlyShare({ size = 24, color = '#000000' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.1206 3.5H8.01633C5.24061 3.5 3.5 5.46539 3.5 8.24678V15.7532C3.5 18.5346 5.23211 20.5 8.01633 20.5H15.9818C18.7669 20.5 20.5 18.5346 20.5 15.7532V14.1089"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.4997 8.07394V3.5M20.4997 3.5H15.9258M20.4997 3.5L13.3691 10.6306"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
