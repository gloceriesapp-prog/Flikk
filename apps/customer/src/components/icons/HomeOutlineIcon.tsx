import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';

// Delivery address pin on the tracking map: a house outline (roof, walls, door).
export const HomeOutlineIcon = memo(function HomeOutlineIcon({ size = 24, color = '#101C10' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M12.2498 1.76233L23.3735 11.294L22.3975 12.433L12.2498 3.73769L2.10208 12.433L1.12607 11.294L12.2498 1.76233Z" />
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M5.09277 9.40918V20.5001H19.4103V9.40918H20.9103V22.0001H3.59277V9.40918H5.09277Z" />
      <Path fillRule="evenodd" clipRule="evenodd" fill={color} d="M12.9998 11.9548L12.9998 16.8632L11.4998 16.8632L11.4998 11.9548L12.9998 11.9548Z" />
    </Svg>
  );
});
