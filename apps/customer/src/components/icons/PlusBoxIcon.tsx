import Svg, { Path } from 'react-native-svg';

// Iconly Light / Plus 1, from the approved bundled plus-1.svg asset.
export function PlusBoxIcon({ size = 32, color = '#155DFC' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path fillRule="evenodd" clipRule="evenodd" d="M16.2178 3H7.78313C4.84378 3 3 5.08119 3 8.02638V15.9736C3 18.9188 4.83503 21 7.78313 21H16.2169C19.1659 21 21 18.9188 21 15.9736V8.02638C21 5.08119 19.1659 3 16.2178 3Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 8.69434V15.2872" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15.2989 11.9924H8.69922" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
