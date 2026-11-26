import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { IconlyIconProps } from './iconly';

// Categories tab: four outlined tiles (one tilted) when inactive, solid
// tiles when active.
const OUTLINE = [
  'M2.10742 2.64331H10.6074V11.1433H2.10742V2.64331ZM3.60742 4.14331V9.64331H9.10742V4.14331H3.60742Z',
  'M14.3515 1.68814L22.5619 3.8881L20.3619 12.0985L12.1515 9.89851L14.3515 1.68814ZM15.4122 3.52526L13.9887 8.83785L19.3012 10.2614L20.7248 4.94876L15.4122 3.52526Z',
  'M2.10742 13.6433H10.6074V22.1433H2.10742V13.6433ZM3.60742 15.1433V20.6433H9.10742V15.1433H3.60742Z',
  'M13.1074 13.6433H21.6074V22.1433H13.1074V13.6433ZM14.6074 15.1433V20.6433H20.1074V15.1433H14.6074Z',
];
const FILLED = [
  'M2.30054 10.9506H10.3005V2.95058H2.30054V10.9506Z',
  'M22.1994 4.12148L14.4714 2.05048L12.4014 9.77848L20.1284 11.8485L22.1994 4.12148Z',
  'M2.30054 21.9496H10.3005V13.9496H2.30054V21.9496Z',
  'M13.3005 21.9496H21.3005V13.9496H13.3005V21.9496Z',
];

export const NavCategoryIcon = memo(function NavCategoryIcon({ size = 24, color = '#101C10', active = false }: IconlyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {(active ? FILLED : OUTLINE).map((d, i) => <Path key={i} d={d} fill={color} fillRule="evenodd" clipRule="evenodd" />)}
    </Svg>
  );
});
