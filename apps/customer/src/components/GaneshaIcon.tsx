// Flat single-tone Ganesha-head glyph — hand-built from primitive SVG
// shapes (react-native-svg, already a dependency via @hugeicons/react-
// native), not a hugeicons icon — no Ganesha glyph exists in
// @hugeicons/core-free-icons. Same size/color prop convention as AppIcon
// so it drops into the same badge slot.

import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export function GaneshaIcon({ size = 22, color = '#FFFFFF' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* crown tip */}
      <Path d="M47 6C47 4 48.5 2 50 2C51.5 2 53 4 53 6C53 10 51.5 14 50 14C48.5 14 47 10 47 6Z" fill={color} />
      {/* head / forehead arc */}
      <Path
        d="M20 38C20 18 33 8 50 8C67 8 80 18 80 38C80 46 76 51 68 51H32C24 51 20 46 20 38Z"
        fill={color}
      />
      {/* forehead tilak */}
      <Path d="M47 22C47 19.5 48.5 17 50 17C51.5 17 53 19.5 53 22C53 25 51.5 28 50 28C48.5 28 47 25 47 22Z" fill={color} />
      {/* left ear */}
      <Path
        d="M28 42C15 40 4 46 4 62C4 78 16 84 28 79C36 76 37 66 33 58C31 53 30 47 28 42Z"
        fill={color}
      />
      {/* right ear */}
      <Path
        d="M72 42C85 40 96 46 96 62C96 78 84 84 72 79C64 76 63 66 67 58C69 53 70 47 72 42Z"
        fill={color}
      />
      {/* trunk */}
      <Path
        d="M42 52C40 62 46 68 52 72C60 77 58 85 50 90C48.5 91 47.5 93 49 95"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
