import Svg, { Path } from 'react-native-svg';

interface Props { size?: number; color?: string }
const STROKE = { strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconlyRefreshLeft({ size = 24, color = '#444444' }: Props) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M4 8.09497L5.60843 11.8991L9.3916 10.2996" stroke={color} {...STROKE} />
    <Path d="M5.83008 11.805C5.92702 7.9839 9.06148 4.91406 12.9149 4.91406C16.8249 4.91406 19.9998 8.08892 19.9998 11.9989C19.9998 15.917 16.8249 19.0838 12.9149 19.0838C10.4914 19.0838 8.35865 17.872 7.07417 16.022" stroke={color} {...STROKE} />
  </Svg>;
}

export function IconlyBike({ size = 24, color = '#444444' }: Props) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M6.14537 18.7502C7.8825 18.7502 9.29073 17.342 9.29073 15.6048C9.29073 13.8677 7.8825 12.4595 6.14537 12.4595C4.40823 12.4595 3 13.8677 3 15.6048C3 17.342 4.40823 18.7502 6.14537 18.7502Z" stroke={color} {...STROKE} />
    <Path d="M17.8544 18.7502C19.5915 18.7502 20.9997 17.342 20.9997 15.6048C20.9997 13.8677 19.5915 12.4595 17.8544 12.4595C16.1172 12.4595 14.709 13.8677 14.709 15.6048C14.709 17.342 16.1172 18.7502 17.8544 18.7502Z" stroke={color} {...STROKE} />
    <Path d="M16.0257 9.83521H13.0699C11.2698 9.83521 9.58342 10.7068 8.55076 12.1753L6.64648 14.8943" stroke={color} {...STROKE} />
    <Path d="M17.6385 14.8943L14.9668 6.00768L16.9469 5.24976" stroke={color} {...STROKE} />
    <Path d="M9.28973 7.33398H6.64648" stroke={color} {...STROKE} />
    <Path d="M9.45249 10.8015L7.71875 7.33398" stroke={color} {...STROKE} />
  </Svg>;
}
