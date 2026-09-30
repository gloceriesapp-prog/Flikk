// Every rupee price = Hugeicons RupeeIcon + the numeral, rendered together so
// the ₹ is a real glyph-icon instead of the text "₹". "Same fill" is the whole
// point: ONE `color` prop drives both the icon stroke AND the number's inline
// color, so they can never drift apart (a className color on the number can't
// be read back to feed the icon — that's exactly the mismatch this avoids).
// `size` likewise drives both: number fontSize and a proportional icon.
//
// The number keeps PriceText (Gilroy-ExtraBold + tabular-nums, the single
// price-numeral face). Pass `color` as a hex (use hex8 for the muted/opacity
// variants the old `text-ink/40` etc. classes gave). Default ink.
//
// ponytail: strike-through (MRP) crosses the numeral only, not the SVG icon —
// react-native can't put text-decoration on an SVG sibling. Reads fine because
// the whole unit is muted to one color; revisit only if a struck icon matters.
import { View, type TextProps } from 'react-native';
import { RupeeIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from './AppIcon';
import { PriceText } from './PriceText';
import { colors } from '../theme/tokens';

interface Props extends Omit<TextProps, 'children'> {
  amount: number | string;
  size?: number;      // numeral fontSize in px; icon scales from it
  color?: string;     // shared fill for icon + numeral (hex/hex8). Default ink
  strike?: boolean;   // line-through MRP
  prefix?: string;    // e.g. "-" for a discount line
}

export function RupeePrice({ amount, size = 14, color = colors.ink, strike, prefix, style, ...rest }: Props) {
  return (
    <View className="flex-row items-center">
      {prefix ? (
        <PriceText style={[{ fontSize: size, color }, style]}>{prefix}</PriceText>
      ) : null}
      <AppIcon icon={RupeeIcon} size={Math.round(size * 0.82)} color={color} strokeWidth={2.2} />
      <PriceText
        {...rest}
        style={[{ fontSize: size, color, marginLeft: Math.max(1, Math.round(size * 0.06)) }, strike && { textDecorationLine: 'line-through' }, style]}
      >
        {amount}
      </PriceText>
    </View>
  );
}
