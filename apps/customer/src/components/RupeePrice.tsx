import { View, type TextProps } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { RupeeIcon } from '@hugeicons/core-free-icons';
import { PriceText } from './PriceText';
import { colors } from '../theme/tokens';

interface Props extends Omit<TextProps, 'children'> {
  amount: number | string;
  size?: number;
  color?: string;
  strike?: boolean;
  prefix?: string;
}

export function RupeePrice({
  amount,
  size = 14,
  color = colors.ink,
  strike,
  prefix,
  style,
  ...rest
}: Props) {
  const iconSize = Math.round(size * 0.82);

  // Move the rupee icon slightly upward so it aligns
  // visually with the price numerals.
  const iconOffset = -Math.max(1, Math.round(size * 0.06));

  const textStyle = {
    fontSize: size,
    lineHeight: Math.ceil(size * 1.15),
    color,
    includeFontPadding: false,
    flexShrink: 0,
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        flexShrink: 0,
      }}
    >
      {prefix ? (
        <PriceText
          numberOfLines={1}
          style={[textStyle, style]}
        >
          {prefix}
        </PriceText>
      ) : null}

      <View
        style={{
          transform: [{ translateY: iconOffset }],
          flexShrink: 0,
        }}
      >
        <HugeiconsIcon
          icon={RupeeIcon}
          size={iconSize}
          color={color}
          strokeWidth={3}
        />
      </View>

      <PriceText
        {...rest}
        numberOfLines={1}
        style={[
          textStyle,

          // Keeps the amount very close to the ₹ icon.
          {
            marginLeft: -1,
          },

          strike && {
            textDecorationLine: 'line-through',
          },

          style,
        ]}
      >
        {amount}
      </PriceText>
    </View>
  );
}