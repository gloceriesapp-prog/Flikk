// Back arrow ("Arrow - Left 2") as RN svg; viewBox 0 0 24 24.
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export function IconlyChevronLeft({ size = 24, color = '#000000' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.8107 4.99999L9.81067 12L16.8107 19L15.75 20.0607L7.68935 12L15.75 3.93933L16.8107 4.99999Z"
        fill={color}
      />
    </Svg>
  );
}
