import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconlyIconProps } from './iconly';

// Buy again tab: two circling arrows. One outline glyph; the active tab
// draws it with a heavier stroke so it reads as selected beside the
// filled icons of the other tabs.
const PATHS = [
  'M3 17.3247L5.96288 18.0097L6.644 15.0634',
  'M20.9995 6.67329L18.0366 5.98828L17.3555 8.93462',
  'M13.4278 3.74955C8.87121 2.9612 4.53827 6.01598 3.74992 10.5726C3.28254 13.274 4.16593 15.8968 5.91221 17.749',
  'M10.5728 20.2505C15.1294 21.0389 19.4623 17.9841 20.2507 13.4275C20.7221 10.7025 19.8192 8.0576 18.0425 6.20288',
];

export const NavBuyAgainIcon = memo(function NavBuyAgainIcon({ size = 24, color = '#101C10', active = false }: IconlyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={active ? 2.3 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
});
