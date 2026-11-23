import Svg, { Path } from 'react-native-svg';

export function IconlySend({ size = 24, color = '#000000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd"
        d="M21.6515 2.15198L2.7955 7.75798L2.4375 7.89398V8.53398L9.8175 13.466L15.4675 7.81598L16.5285 8.87698L10.8665 14.538L15.6035 21.626L15.7765 21.848H16.4185L22.0125 2.89398L22.0625 2.58198L21.6515 2.15198Z"
        fill={color} />
    </Svg>
  );
}
