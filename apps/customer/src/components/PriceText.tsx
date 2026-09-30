// Price numerals only — current price, strike-through MRP, fees, totals — all
// rendered in Gilroy ExtraBold via an explicit inline fontFamily so it never
// leaks to any other text (the app default is Gilroy Medium; a NativeWind
// font-* className can only resolve to a Gilroy face, so a plain className
// can't force one specific weight for numbers — inline style wins). One weight
// on purpose: every price numeral in the app reads the same.
import { Text, type TextProps } from 'react-native';
import { GILROY } from '../theme/fonts';

export function PriceText({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ fontFamily: GILROY.extrabold, fontVariant: ['tabular-nums'] }, style]} />;
}
