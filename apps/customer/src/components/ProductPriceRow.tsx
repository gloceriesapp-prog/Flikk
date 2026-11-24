import { Text, View } from 'react-native';
import { PriceText } from './PriceText';
import { priceComparison, discountPercentLabel } from './priceComparison';

interface Props {
  price: number;
  originalPrice?: number;
  size?: number;
  showMrpLabel?: boolean;
  showDiscount?: boolean;
  onDark?: boolean;
}

// Keep the current price at the shared price font and requested size.
// Secondary values may wrap; narrow cards must never shrink the entire row.
export function ProductPriceRow({ price, originalPrice, size = 18, showMrpLabel = false, showDiscount = true, onDark = false }: Props) {
  const { mrp } = priceComparison(price, originalPrice);
  const discount = discountPercentLabel(price, originalPrice);
  const secondarySize = Math.round(size * 0.72);
  const secondaryColor = onDark ? '#FFFFFF99' : '#8A8F8B';
  const secondaryStyle = { fontSize: secondarySize, lineHeight: Math.ceil(secondarySize * 1.35), color: secondaryColor, includeFontPadding: false };
  return (
    <View accessible
      accessibilityLabel={`₹${price}${mrp !== undefined ? `, MRP ₹${mrp}` : ''}${showDiscount && discount ? `, ${discount}% off` : ''}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 4, rowGap: 2 }}>
      <PriceText numberOfLines={1}
        style={{ fontSize: size, lineHeight: Math.ceil(size * 1.35), color: onDark ? '#FFFFFF' : '#101C10', includeFontPadding: false }}>
        ₹{price}
      </PriceText>
      {mrp !== undefined ? <View style={{ flexDirection: 'row', alignItems: 'baseline', columnGap: 3 }}>
        {showMrpLabel && <Text style={secondaryStyle}>MRP</Text>}
        <PriceText numberOfLines={1} style={[secondaryStyle, { textDecorationLine: 'line-through' }]}>₹{mrp}</PriceText>
      </View> : null}
      {showDiscount && discount ? <Text numberOfLines={1} style={{ ...secondaryStyle, color: onDark ? '#8FE3B0' : '#00A650' }}>{discount}% off</Text> : null}
    </View>
  );
}
